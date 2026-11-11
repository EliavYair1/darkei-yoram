declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
export {};

const keyDigest = Deno.env.get("DARKEI_SITE_API_KEY_SHA256") ?? "__DARKEI_SITE_API_KEY_SHA256__";
const project = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
const fromEmail = Deno.env.get("DARKEI_CONTACT_FROM_EMAIL") || "__CONTACT_FROM_EMAIL__";
const officeEmail = Deno.env.get("NOTIFY_EMAIL") || "__CONTACT_OFFICE_EMAIL__";
const twilioAccount = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const templateSid = "HXe596316f93d49d0a6fc96b13d2e3604f";
const sender = "whatsapp:+15553348081";
const siteSource = "אתר דרכי יורם · טופס באתר";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i;
const numberPattern = /^(?:0\d{8,9}|\+[1-9]\d{7,14})$/;

type Contact = { id: string; full_name: string; email: string; phone: string; notes: string; city?: string | null };
type Receipt = {
  contact_id: string;
  created_at: string;
  email_status: string;
  email_message_id: string | null;
  whatsapp_status: string;
  whatsapp_message_id: string | null;
  contacts: { full_name: string };
};
type Dispatch = { status: string; id?: string };

const reply = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function authorized(request: Request) {
  const value = request.headers.get("X-Darkei-Site-Key") ?? "";
  if (!/^[0-9a-f]{64}$/.test(value) || !/^[0-9a-f]{64}$/.test(keyDigest)) return false;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const actual = new Uint8Array(hash);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ parseInt(keyDigest.slice(i * 2, i * 2 + 2), 16);
  return difference === 0;
}

async function db(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey);
  headers.set("Authorization", `Bearer ${serviceKey}`);
  headers.set("Content-Type", "application/json");
  const result = await fetch(`${project}/rest/v1/${path}`, {
    ...init, headers, signal: AbortSignal.timeout(5000),
  });
  if (!result.ok) throw new Error("Database request failed");
  return result;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

async function sendEmail(contact: Contact, office = false): Promise<Dispatch> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `darkei-contact/${contact.id}/${office ? "office" : "visitor"}`,
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from: fromEmail,
        to: [office ? officeEmail : contact.email],
        subject: office ? "פנייה חדשה מאתר דרכי יורם" : "קיבלנו את פנייתך לאתר דרכי יורם",
        html: office
          ? `<div dir="rtl"><p>${escapeHtml(contact.full_name)}</p><p>${escapeHtml(contact.phone)} · ${escapeHtml(contact.email)}</p><p>${escapeHtml(contact.notes).replaceAll("\n", "<br>")}</p></div>`
          : '<div dir="rtl"><p>שלום, קיבלנו את פנייתך באתר דרכי יורם.</p><p>צוות מוסדות ישימך כאפרים יחזור אליך בהקדם. תודה על פנייתך.</p></div>',
      }),
    });
    const body = await response.json() as { id?: unknown } | null;
    return response.ok && typeof body?.id === "string"
      ? { status: "accepted", id: body.id } : { status: "failed" };
  } catch {
    return { status: "unknown" };
  }
}

const twilioAuth = () => "Basic " + btoa(`${twilioAccount}:${twilioToken}`);
const twilioMessages = () => `https://api.twilio.com/2010-04-01/Accounts/${twilioAccount}/Messages`;

async function approvalStatus() {
  if (!twilioAccount || !twilioToken) return "unavailable";
  const response = await fetch(`https://content.twilio.com/v1/Content/${templateSid}/ApprovalRequests`, {
    headers: { Authorization: twilioAuth() }, signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) return "unsubmitted";
  if (!response.ok) return "unavailable";
  const result = await response.json() as { whatsapp?: { status?: unknown } } | null;
  const status = result?.whatsapp?.status;
  return typeof status === "string" && ["approved", "pending", "received", "rejected", "paused", "disabled", "unsubmitted"].includes(status)
    ? status : "unsubmitted";
}

async function sendWhatsApp(phone: string): Promise<Dispatch> {
  try {
    const status = await approvalStatus();
    if (status !== "approved") return { status: status === "unavailable" ? "unknown" : "template_pending" };
    const number = phone.startsWith("+") ? phone : `+972${phone.slice(1)}`;
    const response = await fetch(`${twilioMessages()}.json`, {
      method: "POST",
      headers: { Authorization: twilioAuth(), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: sender, To: `whatsapp:${number}`, ContentSid: templateSid }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json() as { sid?: unknown; status?: unknown } | null;
    return response.ok && typeof result?.sid === "string"
      ? { status: twilioDeliveryState(result.status) ?? "accepted", id: result.sid }
      : { status: "failed" };
  } catch {
    return { status: "unknown" };
  }
}

function twilioDeliveryState(value: unknown) {
  if (value === "delivered" || value === "read") return "delivered";
  if (typeof value === "string" && ["undelivered", "failed", "canceled"].includes(value)) return "failed";
  return null;
}

async function saveChannel(contactId: string, channel: "email" | "whatsapp", result: Dispatch) {
  await db(`site_contact_delivery?contact_id=eq.${contactId}`, {
    method: "PATCH",
    body: JSON.stringify({
      [`${channel}_status`]: result.status,
      [`${channel}_message_id`]: result.id ?? null,
    }),
  });
}

async function registerContact(request: Request) {
  const input = await request.json() as (Partial<Contact> & {
    whatsapp_consent?: unknown; wants_whatsapp?: unknown; wants_email?: unknown; source?: unknown; first_name?: unknown;
  }) | null;
  if (!input || typeof input !== "object" || Array.isArray(input)) return reply(422, { error: "fields" });
  const id = input.id ?? crypto.randomUUID();
  const notes = input.notes ?? "פנייה מטופס יצירת קשר";
  const city = input.city ?? "";
  const wantsWhatsapp = input.wants_whatsapp ?? input.whatsapp_consent;
  if (typeof id !== "string" || !uuid.test(id)
    || typeof input.full_name !== "string" || input.full_name.length < 2 || input.full_name.length > 70
    || typeof input.email !== "string" || input.email.length > 254 || !emailPattern.test(input.email)
    || typeof input.phone !== "string" || !numberPattern.test(input.phone)
    || typeof notes !== "string" || !notes || notes.length > 1000
    || typeof city !== "string" || city.length > 80
    || (input.source !== undefined && input.source !== "website")
    || (input.first_name !== undefined && (typeof input.first_name !== "string" || input.first_name.length > 70))
    || (input.wants_email !== undefined && input.wants_email !== true)
    || typeof wantsWhatsapp !== "boolean") return reply(422, { error: "fields" });

  const newContact: Contact = {
    id, full_name: input.full_name, email: input.email, phone: input.phone, notes, city: city.trim() || null,
  };
  const prefer = { Prefer: "resolution=ignore-duplicates,return=representation" };
  const inserted: Contact[] = await (await db("contacts?on_conflict=id", {
    method: "POST", headers: prefer,
    body: JSON.stringify({
      ...newContact, first_name: (typeof input.first_name === "string" && input.first_name.trim()) || newContact.full_name.split(/\s+/)[0],
      source: "website", source_detail: siteSource,
      wants_updates: false, wants_whatsapp: false, wants_email: false,
    }),
  })).json();
  let contact = inserted[0];
  if (!contact) {
    const query = new URLSearchParams({
      id: `eq.${newContact.id}`, source_detail: `eq.${siteSource}`,
      select: "id,full_name,email,phone,notes,city",
    });
    const existing: Contact[] = await (await db(`contacts?${query}`)).json();
    contact = existing[0];
    if (!contact || contact.email !== newContact.email || contact.phone !== newContact.phone ||
      contact.full_name !== newContact.full_name || contact.notes !== newContact.notes || (contact.city ?? null) !== newContact.city) {
      return reply(409, { error: "conflict" });
    }
  }
  const tracked: Receipt[] = await (await db("site_contact_delivery?on_conflict=contact_id", {
    method: "POST", headers: prefer,
    body: JSON.stringify({
      contact_id: contact.id,
      whatsapp_status: wantsWhatsapp ? "pending" : "skipped",
    }),
  })).json();
  if (tracked.length) {
    const actions: Promise<unknown>[] = [
      sendEmail(contact).then(result => saveChannel(contact.id, "email", result)),
      sendEmail(contact, true),
    ];
    if (wantsWhatsapp) {
      actions.push(sendWhatsApp(contact.phone).then(result => saveChannel(contact.id, "whatsapp", result)));
    }
    EdgeRuntime.waitUntil(Promise.allSettled(actions));
  }
  return reply(inserted.length ? 201 : 200, { ok: true });
}

async function refreshDelivery(id: string) {
  const results: Receipt[] = await (await db(`site_contact_delivery?contact_id=eq.${id}`)).json();
  const row = results[0];
  if (!row) return;
  const updates: Record<string, string> = {};
  await Promise.allSettled([
    (async () => {
      if (row.email_status !== "accepted" || !row.email_message_id) return;
      const response = await fetch(`https://api.resend.com/emails/${encodeURIComponent(row.email_message_id)}`, {
        headers: { Authorization: `Bearer ${resendKey}` }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return;
      const data = await response.json() as { last_event?: unknown } | null;
      if (typeof data?.last_event !== "string") return;
      if (["delivered", "opened", "clicked"].includes(data.last_event)) updates.email_status = "delivered";
      if (["bounced", "failed", "suppressed"].includes(data.last_event)) updates.email_status = "failed";
    })(),
    (async () => {
      if (row.whatsapp_status !== "accepted" || !row.whatsapp_message_id) return;
      const response = await fetch(`${twilioMessages()}/${encodeURIComponent(row.whatsapp_message_id)}.json`, {
        headers: { Authorization: twilioAuth() }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return;
      const data = await response.json() as { status?: unknown } | null;
      const state = twilioDeliveryState(data?.status);
      if (state) updates.whatsapp_status = state;
    })(),
  ]);
  if (Object.keys(updates).length) await db(`site_contact_delivery?contact_id=eq.${id}`, {
    method: "PATCH", body: JSON.stringify(updates),
  });
}

export async function handleSiteContact(request: Request) {
  if (!await authorized(request)) return reply(403, { error: "forbidden" });
  try {
    if (request.method === "POST") return await registerContact(request);
    if (request.method !== "GET") return reply(405, { error: "method" });

    const params = new URL(request.url).searchParams;
    if (params.get("view") === "donors") {
      const offset = Number(params.get("offset") ?? "0");
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 250000) return reply(422, { error: "offset" });
      const response = await db(`donors?select=id,full_name,phone,email,amount,donation_date,status&order=donation_date.desc.nullslast,id.desc&limit=26&offset=${offset}`, {
        headers: { Prefer: "count=exact" },
      });
      const total = response.headers.get("content-range")?.split("/")[1];
      return reply(200, { rows: await response.json(), total: total && /^\d+$/.test(total) ? Number(total) : null });
    }
    if (params.get("view") === "deliveries") {
      const refresh = params.get("verify");
      if (refresh && uuid.test(refresh)) await refreshDelivery(refresh);
      const [rows, template] = await Promise.all([
        db("site_contact_delivery?select=contact_id,created_at,email_status,whatsapp_status,contacts(full_name)&order=created_at.desc,contact_id.desc&limit=25")
          .then(response => response.json()),
        approvalStatus().catch(() => "unavailable"),
      ]);
      return reply(200, { rows, template });
    }
    return reply(404, { error: "view" });
  } catch {
    return reply(503, { error: "unavailable" });
  }
}
