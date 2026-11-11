// The public key verifies requests from the Sites server. No provider credentials leave Supabase.
const publicKey = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEeOEUIPwNLtDQHtTS2RRtx2OLB/MHLkQF74tknLY58LRlSUDEk8P+TAGq1N7mZvW+Fs8KWRP9o3b1muyP/cofIg==";
const sender = "whatsapp:+15553348081";

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

const verifier = crypto.subtle.importKey(
  "spki", decodeBase64(publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"],
);
const responseHeaders = { "Cache-Control": "no-store" };
type Result = { state: string; code?: number; ref?: string };

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function twilioAuth() {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!sid || !token) return null;
  return { url: `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages`, auth: "Basic " + btoa(sid + ":" + token) };
}

async function sendWhatsApp(phone: string, amount: number, vip: boolean): Promise<Result> {
  const twilio = twilioAuth();
  if (!twilio) return { state: "unavailable" };
  try {
    const response = await fetch(twilio.url + ".json", {
      method: "POST",
      headers: { Authorization: twilio.auth, "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(6000),
      body: new URLSearchParams({
        From: sender,
        To: "whatsapp:" + phone,
        Body: `בדיקת אתר דרכי יורם. תרומת ${vip ? "VIP " : ""}בדיקה בסך ${amount} ₪. לא בוצע חיוב ולא הופקה קבלה.`,
      }),
    });
    const data = await response.json();
    if (!response.ok || !/^(SM|MM)[a-f0-9]{32}$/i.test(data.sid)) {
      return { state: "rejected", code: Number(data.code) || response.status };
    }
    return { state: data.status === "delivered" || data.status === "read" ? "delivered" : "accepted", ref: data.sid };
  } catch {
    return { state: "unknown" };
  }
}

async function sendTestEmail(to: string, name: string, amount: number, id: string): Promise<Result> {
  if (!Deno.env.get("RESEND_API_KEY")) return { state: "unavailable" };
  try {
    const response = amount >= 1000
      ? await sendVipEmail(to, name, amount, "", id)
      : await sendEmail(to, name, amount, "", false, id);
    const data = await response.json();
    if (!response.ok || !/^[a-f0-9-]{36}$/i.test(data.id)) return { state: "rejected", code: response.status };
    return { state: "accepted", ref: data.id };
  } catch {
    return { state: "unknown" };
  }
}

async function deliveryStatus(channel: "email" | "whatsapp", ref?: string): Promise<Result> {
  if (!ref) return { state: "skipped" };
  const email = channel === "email";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const twilio = twilioAuth();
  if (email && (!resendKey || !/^[a-f0-9-]{36}$/i.test(ref))) return { state: "unavailable" };
  if (!email && (!twilio || !/^(SM|MM)[a-f0-9]{32}$/i.test(ref))) return { state: "unavailable" };
  try {
    const url = email ? `https://api.resend.com/emails/${ref}` : twilio!.url + `/${ref}.json`;
    const auth = email ? "Bearer " + resendKey : twilio!.auth;
    const response = await fetch(url, { headers: { Authorization: auth }, signal: AbortSignal.timeout(6000) });
    if (!response.ok) return { state: "unknown", code: response.status };
    const data = await response.json();
    const state = email ? data.last_event : data.status;
    if (["delivered", "read", "opened", "clicked"].includes(state)) return { state: "delivered" };
    if (["failed", "bounced", "undelivered", "canceled", "suppressed", "complained"].includes(state)) {
      return { state: "rejected", code: Number(data.error_code) || undefined };
    }
    return { state: "accepted" };
  } catch {
    return { state: "unknown" };
  }
}
async function sendEmail(to: string, name: string, amount: number, dedication: string, isRecurring: boolean, idempotencyKey: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey || !to) throw new Error("email_config");

  const subject = isRecurring ? "תודה על הצטרפותך להוראת קבע ♥" : "תודה על תרומתך ♥";
  const dedicationLine = dedication ? `<p>הקדשת את התרומה: <strong>${dedication}</strong></p>` : "";
  const recurringLine = isRecurring ? `<p>הוראת קבע חודשית של ₪${amount} תחל מחודש הבא.</p>` : "";

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    signal: AbortSignal.timeout(6000),
    body: JSON.stringify({
      from: "מוסדות ישימך כאפרים <noreply@yesimchakeefraim.co.il>",
      to: [to],
      subject: "[בדיקת אתר] " + subject,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">תודה רבה, ${name}!</h2>
          <p><strong>הודעת בדיקה בלבד. לא בוצע חיוב ולא הופקה קבלה.</strong></p>
          <p>קיבלנו את תרומתך בסך <strong>₪${amount}</strong> למוסדות ישימך כאפרים.</p>
          ${dedicationLine}
          ${recurringLine}
          <p>זכותך תגן עליך ועל משפחתך. יישר כח!</p>
          <hr style="border-color: #b5862a;" />
          <p style="color: #666; font-size: 12px;">מוסדות ישימך כאפרים</p>
        </div>
      `,
    }),
  });
}

async function sendVipEmail(to: string, name: string, amount: number, dedication: string, idempotencyKey: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey || !to) throw new Error("email_config");

  const dedicationLine = dedication ? `<p style="font-size:16px; color:#5a3e1b;">הקדשה: <strong>${dedication}</strong></p>` : "";
  const today = new Date().toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    signal: AbortSignal.timeout(6000),
    body: JSON.stringify({
      from: "מוסדות ישימך כאפרים <noreply@yesimchakeefraim.co.il>",
      to: [to],
      subject: "[בדיקת אתר] 🏆 תודה מיוחדת מהרב — תורם מצטיין",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0; padding:0; background:#f5f0e8; font-family: 'Arial', sans-serif;">
          <div style="max-width:600px; margin:0 auto; padding:20px;">

            <p style="text-align:center"><strong>תעודת הוקרה לדוגמה · לא בוצע חיוב</strong></p>
            <!-- תעודת הוקרה -->
            <div style="
              background: linear-gradient(135deg, #1e3a5f 0%, #2d5a9e 100%);
              border-radius: 16px;
              padding: 40px 30px;
              text-align: center;
              margin-bottom: 20px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              position: relative;
              overflow: hidden;
            ">
              <!-- כוכבים -->
              <div style="position:absolute; top:10px; right:15px; font-size:24px; opacity:0.4;">✦</div>
              <div style="position:absolute; top:20px; left:20px; font-size:18px; opacity:0.3;">✦</div>
              <div style="position:absolute; bottom:15px; right:30px; font-size:16px; opacity:0.3;">✦</div>

              <!-- כותרת -->
              <div style="color: #d4af37; font-size: 14px; letter-spacing: 3px; margin-bottom: 8px; text-transform: uppercase;">מוסדות ישימך כאפרים</div>

              <div style="width: 60px; height: 2px; background: #d4af37; margin: 0 auto 20px;"></div>

              <h1 style="color: #ffffff; font-size: 32px; margin: 0 0 8px; font-weight: bold;">תעודת הוקרה</h1>
              <h2 style="color: #d4af37; font-size: 20px; margin: 0 0 24px; font-weight: normal;">לתורם מצטיין</h2>

              <div style="width: 60px; height: 2px; background: #d4af37; margin: 0 auto 24px;"></div>

              <!-- שם התורם -->
              <div style="
                background: rgba(255,255,255,0.1);
                border: 2px solid #d4af37;
                border-radius: 12px;
                padding: 20px 30px;
                margin-bottom: 20px;
                display: inline-block;
                min-width: 200px;
              ">
                <div style="color: #b0c4de; font-size: 13px; margin-bottom: 6px;">מוענק בהוקרה ובברכה ל</div>
                <div style="color: #ffffff; font-size: 26px; font-weight: bold;">${name}</div>
              </div>

              <!-- הסכום -->
              <div style="color: #e8f4f8; font-size: 16px; margin-bottom: 8px;">על תרומתו הנדיבה בסך</div>
              <div style="color: #d4af37; font-size: 36px; font-weight: bold; margin-bottom: 16px;">₪${amount.toLocaleString("he-IL")}</div>

              ${dedicationLine ? `<div style="color: #b0c4de; font-size: 14px; font-style: italic; margin-bottom: 16px;">${dedicationLine}</div>` : ""}

              <!-- תאריך -->
              <div style="color: #7a9cbf; font-size: 13px;">${today}</div>

              <div style="width: 60px; height: 2px; background: #d4af37; margin: 20px auto 16px;"></div>

              <!-- חותמת -->
              <div style="color: #d4af37; font-size: 20px;">✡</div>
              <div style="color: #b0c4de; font-size: 13px; margin-top: 8px;">יהי רצון שתזכה לברכה והצלחה בכל מעשה ידיך</div>
            </div>

            <!-- הודעה אישית -->
            <div style="
              background: #ffffff;
              border-radius: 12px;
              padding: 28px;
              border-right: 5px solid #d4af37;
              box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            ">
              <h3 style="color: #1e3a5f; margin-top: 0;">אדון/גברת ${name} היקר/ה,</h3>
              <p style="color: #444; line-height: 1.8; font-size: 15px;">
                בשם מוסדות ישימך כאפרים, אנו מבקשים להודות לך מעומק הלב על תרומתך הנדיבה.
                <br><br>
                תרומה כה משמעותית מאפשרת לנו להמשיך ולפעול למען הקהילה ולסייע לנזקקים.
                <br><br>
                זכותך של מצווה גדולה זו תעמוד לך ולכל בני משפחתך, ותזכו לברכה, לבריאות ולשמחה.
              </p>
              <p style="color: #1e3a5f; font-weight: bold; font-size: 16px;">בברכה ובהוקרה עמוקה,</p>
              <p style="color: #666; font-size: 14px;">הנהלת מוסדות ישימך כאפרים</p>
            </div>

            <!-- VIP badge -->
            <div style="text-align: center; margin-top: 16px;">
              <span style="
                background: linear-gradient(135deg, #d4af37, #f0c040);
                color: #1e3a5f;
                padding: 8px 20px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: bold;
                letter-spacing: 1px;
              ">⭐ תורם VIP — מוסדות ישימך כאפרים ⭐</span>
            </div>

          </div>
        </body>
        </html>
      `,
    }),
  });
}



type KesherDeliveryRow = {
  recorded_at: string;
  amount: number | null;
  donor_saved: boolean;
  email_state: string;
  email_message_id: string | null;
  whatsapp_state: string;
  whatsapp_message_id: string | null;
  whatsapp_error_code: number | null;
};

async function readKesherDelivery(reference: string) {
  const project = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!project || !serviceKey) return new Response(null, { status: 503, headers: responseHeaders });
  try {
    const query = new URLSearchParams({
      transaction_ref: "eq." + reference, order: "recorded_at.desc", limit: "5",
      select: "recorded_at,amount,donor_saved,email_state,email_message_id,whatsapp_state,whatsapp_message_id,whatsapp_error_code",
    });
    const response = await fetch(`${project}/rest/v1/kesher_delivery?${query}`, {
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return new Response(null, { status: 503, headers: responseHeaders });
    const rows = await response.json() as KesherDeliveryRow[];
    if (rows.length === 0) {
      const lookup = new URLSearchParams({
        kesher_ref: "eq." + reference, limit: "1",
        select: "donation_date,amount",
      });
      const result = await fetch(`${project}/rest/v1/donors?${lookup}`, {
        headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey },
        signal: AbortSignal.timeout(4000),
      });
      if (!result.ok) return new Response(null, { status: 503, headers: responseHeaders });
      const [donorRecord] = await result.json() as { donation_date: string | null; amount: number | null }[];
      return Response.json({ attempts: [], donorRecord: donorRecord ?? null }, { headers: responseHeaders });
    }
    const attempts = await Promise.all(rows.map(async row => {
      const [email, whatsapp] = await Promise.all([
        row.email_message_id ? deliveryStatus("email", row.email_message_id) : { state: row.email_state },
        row.whatsapp_message_id ? deliveryStatus("whatsapp", row.whatsapp_message_id)
          : { state: row.whatsapp_state, code: row.whatsapp_error_code },
      ]);
      return {
        recordedAt: row.recorded_at, amount: row.amount, donorSaved: row.donor_saved,
        email, whatsapp,
      };
    }));
    return Response.json({ attempts }, { headers: responseHeaders });
  } catch {
    return new Response(null, { status: 503, headers: responseHeaders });
  }
}

async function sendPartnerCard(email: string, name: string, id: string): Promise<Result> {
  const project = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!project || !serviceKey) return { state: "unavailable" };
  try {
    const prepared = await fetch(`${project}/rest/v1/rpc/prepare_partner_card_test`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
      body: JSON.stringify({ test_id: id, test_email: email, test_name: name }),
      signal: AbortSignal.timeout(3000),
    });
    if (!prepared.ok) return { state: "unavailable" };
    const message = await prepared.json();
    if (!message || typeof message.payload !== "string" || !/^[0-9a-f]{64}$/.test(message.signature)
      || !Number.isSafeInteger(message.issuedAt)) return { state: "unavailable" };

    const response = await fetch(`${project}/functions/v1/send-partner-card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Partner-Card-Issued-At": String(message.issuedAt),
        "X-Partner-Card-Signature": message.signature,
      },
      body: JSON.stringify({ payload: message.payload }),
      signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json();
    return response.ok && /^[a-f0-9-]{36}$/i.test(result?.email_id ?? "")
      ? { state: "accepted", ref: result.email_id }
      : { state: "rejected", code: result?.provider_status ?? response.status };
  } catch {
    return { state: "unknown" };
  }
}

Deno.serve(async req => {
  if (req.method !== "POST") return new Response(null, { status: 405, headers: responseHeaders });
  const body = await req.text();
  const signature = req.headers.get("X-Donation-Test-Signature") ?? "";
  if (body.length > 2048 || !/^[A-Za-z0-9+/=]{80,100}$/.test(signature)
    || !await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, await verifier,
      decodeBase64(signature), new TextEncoder().encode(body)).catch(() => false)) {
    return new Response(null, { status: 403, headers: responseHeaders });
  }
  const data = JSON.parse(body);
  if (!Number.isFinite(data.ts) || Math.abs(Date.now() - data.ts) > 60_000) {
    return new Response(null, { status: 403, headers: responseHeaders });
  }
  if (data.action === "kesher") {
    if (typeof data.reference !== "string" || !/^[a-zA-Z0-9._:/-]{1,120}$/.test(data.reference)) {
      return new Response(null, { status: 422, headers: responseHeaders });
    }
    return readKesherDelivery(data.reference);
  }
  if (data.action === "health") {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    return Response.json({ email: !!Deno.env.get("RESEND_API_KEY"), whatsapp: !!twilioAuth(),
      stripeTestKey: /^(sk|rk)_test_/.test(stripeKey) }, { headers: responseHeaders });
  }
  if (data.action === "status") {
    const [email, whatsapp] = await Promise.all([
      deliveryStatus("email", data.emailRef),
      deliveryStatus("whatsapp", data.whatsappRef),
    ]);
    return Response.json({ email, whatsapp }, { headers: responseHeaders });
  }
  if (data.action === "partner") {
    if (typeof data.id !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.id)
      || typeof data.email !== "string" || data.email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)
      || typeof data.name !== "string" || data.name.length < 2 || data.name.length > 80) {
      return new Response(null, { status: 422, headers: responseHeaders });
    }
    const email = await sendPartnerCard(data.email, data.name, data.id);
    return Response.json({ email, whatsapp: { state: "skipped" } }, { headers: responseHeaders });
  }
  if (data.action !== "send" || ![18, 1001].includes(data.amount)
    || typeof data.id !== "string" || !/^[a-f0-9-]{36}$/i.test(data.id)
    || typeof data.email !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)
    || (data.phone && (typeof data.phone !== "string" || !/^\+9725\d{8}$/.test(data.phone)))) {
    return new Response(null, { status: 422, headers: responseHeaders });
  }
  const name = escapeHtml(String(data.name || "צוות דרכי יורם").slice(0, 80));
  const [email, whatsapp] = await Promise.all([
    sendTestEmail(data.email, name, data.amount, data.id),
    data.phone ? sendWhatsApp(data.phone, data.amount, data.amount >= 1000) : { state: "skipped" },
  ]);
  return Response.json({ email, whatsapp }, { headers: responseHeaders });
});
