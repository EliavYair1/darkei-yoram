const CONTACTS_URL = "https://yyjdckgnaamfexdvigqk.supabase.co/functions/v1/site-contact";
const MAX_BODY_BYTES = 8192;
const HOUR_MS = 3_600_000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const topics = new Set([
  "פנייה כללית", "שיעורי אמונה וביטחון", "פעילות אהבת ישראל",
  "פנייה לקופת החסד", "אבות ובנים", "הצטרפות לפעילות", "החזקת התורה",
  "מזון למשפחות", "תרומה חודשית לקופת החסד", "צורכי תינוקות",
  "שבתות וחגים", "ילדים ונוער", "התנדבות בקופת החסד",
  "הצטרפות למועדון השותפים",
  "תרומה חד־פעמית – החזקת הכוללים", "שותפות חודשית – החזקת הכוללים",
  "תרומה חד־פעמית – שיעורי תורה", "שותפות חודשית – שיעורי תורה",
  "תרומה חד־פעמית – קופת החסד", "שותפות חודשית – קופת החסד",
  "תרומה חד־פעמית – נוער ואבות ובנים", "שותפות חודשית – נוער ואבות ובנים",
  "תרומה חד־פעמית – בניין בית הכנסת", "שותפות חודשית – בניין בית הכנסת",
]);

const reply = (status: number, error?: string, retryAfter?: number) => Response.json(
  error ? { error } : { ok: true },
  { status, headers: { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } },
);

const safeText = (value: string) => value.trim().replaceAll("<", "‹").replaceAll(">", "›");

async function hashBucket(salt: string, scope: string, value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${scope}:${value}`));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function submitContact(request: Request, env: Cloudflare.Env) {
  if (request.method !== "POST") return reply(405, "method");
  const url = new URL(request.url);
  if (request.headers.get("Origin") !== url.origin) return reply(403, "origin");
  if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
    return reply(415, "format");
  }

  let input: Record<string, unknown>;
  try {
    const body = request.body?.getReader();
    if (!body) return reply(400, "format");
    const decoder = new TextDecoder();
    let content = "";
    let bytes = 0;
    while (true) {
      const chunk = await body.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await body.cancel();
        return reply(413, "size");
      }
      content += decoder.decode(chunk.value, { stream: true });
    }
    input = JSON.parse(content + decoder.decode());
    if (!input || typeof input !== "object" || Array.isArray(input)) return reply(400, "format");
  } catch {
    return reply(400, "format");
  }

  if (input.website) return reply(400, "fields");
  const id = typeof input.id === "string" ? input.id : "";
  const name = typeof input.name === "string" ? safeText(input.name) : "";
  const phone = typeof input.phone === "string" ? input.phone.trim().replace(/[\s().-]/g, "") : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const city = typeof input.city === "string" ? safeText(input.city) : "";
  const message = typeof input.message === "string" ? safeText(input.message) : "";
  const topic = typeof input.topic === "string" ? input.topic : "";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    || name.length < 2 || name.length > 70
    || !/^(?:0\d{8,9}|\+[1-9]\d{7,14})$/.test(phone)
    || city.length > 80 || email.length > 254 || !emailPattern.test(email)
    || !message || message.length > 900 || !topics.has(topic)) {
    return reply(422, "fields");
  }

  const db = env.DB;
  if (!db || !env.DARKEI_SITE_API_KEY || !env.SUPABASE_ANON_KEY || !env.CONTACT_RATE_SALT) return reply(503, "unavailable");
  const localPhone = phone.startsWith("+972") ? `0${phone.slice(4)}` : phone;
  const contact = {
    id,
    full_name: name,
    phone: localPhone,
    email,
    notes: `נושא: ${topic}\n${message}`,
    whatsapp_consent: input.whatsappConsent === true,
  };
  const payload = JSON.stringify({
    id, full_name: name, first_name: name.split(/\s+/)[0], phone: localPhone,
    email, city, source: "website", notes: contact.notes,
    wants_whatsapp: contact.whatsapp_consent, wants_email: true,
  });
  const dedupPayload = JSON.stringify(city ? { ...contact, city } : contact);
  const now = Date.now();
  const hour = Math.floor(now / HOUR_MS);
  try {
    const [clientBucket, phoneBucket, payloadHash] = await Promise.all([
      hashBucket(env.CONTACT_RATE_SALT, "client", request.headers.get("CF-Connecting-IP") ?? "unknown"),
      hashBucket(env.CONTACT_RATE_SALT, "phone", localPhone),
      hashBucket(env.CONTACT_RATE_SALT, "contact", dedupPayload),
    ]);
    const [, , admission] = await db.batch<{ payload_hash: string; accepted: number }>([
      db.prepare("DELETE FROM contact_submission WHERE hour < ?").bind(hour - 1),
      db.prepare(`INSERT INTO contact_submission (id, payload_hash, hour, client_bucket, phone_bucket)
        SELECT ?1, ?2, ?3, ?4, ?5
        WHERE (SELECT count(*) FROM contact_submission WHERE hour = ?3 AND client_bucket = ?4) < 8
          AND (SELECT count(*) FROM contact_submission WHERE hour = ?3 AND phone_bucket = ?5) < 3
        ON CONFLICT(id) DO NOTHING`).bind(id, payloadHash, hour, clientBucket, phoneBucket),
      db.prepare("SELECT payload_hash, accepted FROM contact_submission WHERE id = ?").bind(id),
    ]);
    const existing = admission.results[0];
    if (!existing) return reply(429, "limit", Math.ceil(((hour + 1) * HOUR_MS - now) / 1000));
    if (existing.payload_hash !== payloadHash) return reply(409, "conflict");
    if (existing.accepted) return reply(200);

    const result = await fetch(CONTACTS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
        "apikey": env.SUPABASE_ANON_KEY,
        "X-Darkei-Site-Key": env.DARKEI_SITE_API_KEY,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(16000),
      body: payload,
    });
    if (result.ok) {
      await db.prepare("UPDATE contact_submission SET accepted = 1 WHERE id = ? AND payload_hash = ?")
        .bind(id, payloadHash).run().catch(() => {});
      return reply(result.status);
    }
    if (result.status === 422) return reply(422, "fields");
    if (result.status === 409) return reply(409, "conflict");
  } catch {
    // Return a generic error without logging contact details or server keys.
  }
  return reply(503, "unavailable");
}
