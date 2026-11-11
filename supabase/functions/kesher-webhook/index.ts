import { asRecord, findVerifiedPayment, transactionReference, websiteDonationId } from "./verified-payment.ts";
import { trackDonationDelivery } from "./delivery-tracking.ts";
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const KESHER_USER = Deno.env.get("KESHER_USERNAME")!;
const KESHER_PASS = Deno.env.get("KESHER_PASSWORD")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@yesimchakeefraim.co.il";
const RABBI_EMAIL = "ma160180@gmail.com";
const LARGE_DONATION_THRESHOLD = 1000;
const KESHER_API_URL = "https://kesherhk.info/ConnectToKesher/ConnectToKesher";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://yyjdckgnaamfexdvigqk.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CANCELLATION_MESSAGE = `שלום {שם},

תודה רבה על תרומתך ושותפותך עמנו במוסדות ישימך כאפרים.

מבאס אותנו לשמוע שאתה עוזב את הפעילות, אבל הדלת תמיד פתוחה עבורך.
תרומתך עשתה הבדל אמיתי, ואנחנו מודים לך מכל הלב.

אם תרצה לחזור בכל עת – נשמח לקבל אותך בחזרה.

בברכה,
מוסדות ישימך כאפרים`;

const DONATION_THANKS_MESSAGE = `שלום {שם},

תודה רבה על תרומתך הנדיבה של {סכום} ₪ למוסדות ישימך כאפרים!

תרומתך מגיעה ישירות לאלה שזקוקים לה ועושה הבדל אמיתי.

אנחנו מודים לך מכל הלב על שותפותך עמנו.

בברכה,
מוסדות ישימך כאפרים`;

const formatAmount = (sum: unknown): string => {
  const num = parseFloat(String(sum));
  if (isNaN(num)) return String(sum);
  return num.toLocaleString("he-IL");
};

const normalizeIsraeliPhone = (phone: string): string => {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "972" + p.slice(1);
  if (!p.startsWith("+")) p = "+" + p;
  return p;
};

async function sendEmail(to: string, subject: string, message: string, html?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `מוסדות ישימך כאפרים <${FROM_EMAIL}>`,
      to: [to],
      subject,
      text: message,
      html: html ?? `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: right;"><p>${message.replace(/\n/g, "<br>")}</p></div>`,
    }),
  });
  const data = await res.json();
  return { success: res.ok, data };
}

function buildReceiptHtml({
  name, amount, purpose, receiptNumber, date, tranRef
}: {
  name: string;
  amount: string;
  purpose?: string;
  receiptNumber: number;
  date: string;
  tranRef?: string;
}): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><title>קבלה על תרומה</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:30px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
      <!-- Header -->
      <tr><td style="background:#1b2a52;padding:30px 40px;text-align:center;">
        <h1 style="color:#c9a227;margin:0;font-size:24px;">מוסדות ישימך כאפרים</h1>
        <p style="color:#e8d5a0;margin:8px 0 0;font-size:14px;">קבלה על תרומה</p>
      </td></tr>
      <!-- Receipt Number Badge -->
      <tr><td style="background:#c9a227;padding:12px 40px;text-align:center;">
        <span style="color:#1b2a52;font-weight:bold;font-size:14px;">מספר קבלה: #${receiptNumber}</span>
        <span style="color:#1b2a52;margin-right:30px;font-size:14px;">תאריך: ${date}</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:40px;">
        <p style="color:#333;font-size:16px;margin:0 0 24px;">שלום <strong>${name}</strong>,</p>
        <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 30px;">תודה רבה על תרומתך הנדיבה! תרומתך תעשה הבדל אמיתי בחיי לומדי הכולל.</p>
        <!-- Amount Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
          <tr>
            <td style="background:#f0f4ff;border-right:4px solid #1b2a52;border-radius:8px;padding:20px 24px;">
              <p style="margin:0;color:#555;font-size:13px;">סכום התרומה</p>
              <p style="margin:6px 0 0;color:#1b2a52;font-size:32px;font-weight:bold;">&#x20AA;${amount}</p>
              ${purpose ? `<p style="margin:8px 0 0;color:#666;font-size:13px;">יעוד: <strong>${purpose}</strong></p>` : ""}
            </td>
          </tr>
        </table>
        <!-- Details Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:30px;">
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 0;color:#777;font-size:13px;width:40%;">שם התורם</td>
            <td style="padding:12px 0;color:#333;font-size:14px;font-weight:bold;">${name}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 0;color:#777;font-size:13px;">תאריך תרומה</td>
            <td style="padding:12px 0;color:#333;font-size:14px;">${date}</td>
          </tr>
          ${tranRef ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:12px 0;color:#777;font-size:13px;">מספר עסקה</td><td style="padding:12px 0;color:#333;font-size:14px;">${tranRef}</td></tr>` : ""}
          <tr>
            <td style="padding:12px 0;color:#777;font-size:13px;">מספר קבלה</td>
            <td style="padding:12px 0;color:#333;font-size:14px;">#${receiptNumber}</td>
          </tr>
        </table>
        <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:20px;margin:0;">מסמך זה משמש כקבלה על תרומתך. לשאלות ופרטים נוספים צרו אתנו בטלפון 077-9160180.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#1b2a52;padding:20px 40px;text-align:center;">
        <p style="color:#c9a227;margin:0;font-size:13px;">פעלתם בזכות התורה והחסד • מוסדות ישימך כאפרים</p>
        <p style="color:#8899bb;margin:6px 0 0;font-size:12px;">yesimchakeefraim.co.il</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

async function sendWhatsApp(phone: string, message: string, contentSid?: string) {
  const whatsappPhone = normalizeIsraeliPhone(phone);
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    From: TWILIO_WHATSAPP_FROM,
    To: `whatsapp:${whatsappPhone}`,
  });
  if (contentSid && /^HX[a-f0-9]{32}$/i.test(contentSid)) body.set("ContentSid", contentSid);
  else body.set("Body", message);
  const res = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(TWILIO_ACCOUNT_SID + ":" + TWILIO_AUTH_TOKEN)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const data = await res.json();
  return { success: res.ok, data };
}

async function getContactFromGetTrans(ref: string, isTranRef = false) {
  const payload: Record<string, string> = {
    func: "GetTrans",
    format: "json",
    userName: KESHER_USER,
    password: KESHER_PASS,
  };
  if (isTranRef) {
    payload["tranRef"] = ref;
  } else {
    payload["obligationRef"] = ref;
  }
  const res = await fetch(KESHER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log("GetTrans response:", JSON.stringify(data).slice(0, 500));
  const transactions = data?.Trans ?? data?.trans ?? [];
  if (transactions.length > 0) {
    const t = transactions[0];
    return {
      phone: t.Phone ?? t.phone ?? null,
      email: t.Mail ?? t.mail ?? null,
      name: t.Name ?? t.name ?? null,
      firstName: t.FirstName ?? t.firstName ?? null,
      city: t.City ?? t.city ?? null,
    };
  }
  return null;
}

async function saveDonorToSupabase({
  kesherRef, fullName, firstName, phone, email, city, amount, status, purpose
}: {
  kesherRef?: string;
  fullName?: string | null;
  firstName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  amount?: number | null;
  status: string;
  purpose?: string | null;
}) {
  try {
    const record: Record<string, unknown> = {
      full_name: fullName ?? null,
      first_name: firstName ?? null,
      phone: phone ?? null,
      email: email ?? null,
      city: city ?? null,
      status,
      donation_date: new Date().toISOString(),
    };
    if (amount !== undefined) record.amount = amount;
    if (kesherRef) record.kesher_ref = kesherRef;
    if (purpose) record.purpose = purpose;

    let result;
    if (kesherRef) {
      result = await supabase
        .from("donors")
        .upsert(record, { onConflict: "kesher_ref" })
        .select("receipt_number")
        .single();
    } else {
      result = await supabase.from("donors").insert(record).select("receipt_number").single();
    }

    if (result.error) {
      console.error("Supabase upsert error:", JSON.stringify(result.error));
    } else {
      console.log("Donor saved to Supabase:", kesherRef ?? "(no ref)");
    }
    return result;
  } catch (err) {
    console.error("saveDonorToSupabase exception:", err);
    return null;
  }
}

async function notifyRabbiLargeDonation({
  donorName, donorFirstName, donorPhone, donorEmail, donorCity, amount, tranRef
}: {
  donorName: string | null;
  donorFirstName: string | null;
  donorPhone: string | null;
  donorEmail: string | null;
  donorCity: string | null;
  amount: unknown;
  tranRef?: string;
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  const name = donorName ?? donorFirstName ?? "לא ידוע";
  const phone = donorPhone ?? "לא ידוע";
  const email = donorEmail ?? "לא ידוע";
  const city = donorCity ?? "לא ידוע";
  const amountStr = formatAmount(amount);
  const ref = tranRef ?? "לא ידוע";
  const subject = `🌟 תרומה גדולה התקבלה – ${amountStr} ₪ – ${name}`;
  const textBody = `תרומה גדולה התקבלה!\n\nשם: ${name}\nטלפון: ${phone}\nאימייל: ${email}\nעיר: ${city}\nסכום: ₪${amountStr}\nתאריך: ${dateStr} ${timeStr}\nמספר עסקה: ${ref}`;
  const htmlBody = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f6f0;">
  <div style="background:#1b2a52;color:#c9a227;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="margin:0;font-size:22px;">מוסדות ישימך כאפרים</h1>
    <p style="margin:5px 0 0;font-size:16px;">🌟 התקבלה תרומה גדולה!</p>
  </div>
  <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e0d9cc;">
    <table style="width:100%;border-collapse:collapse;">
      <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;font-weight:bold;color:#555;width:35%;">שם מלא</td><td style="padding:10px 0;color:#222;">${name}</td></tr>
      <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;font-weight:bold;color:#555;">טלפון</td><td style="padding:10px 0;color:#222;">${phone}</td></tr>
      <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;font-weight:bold;color:#555;">אימייל</td><td style="padding:10px 0;color:#222;">${email}</td></tr>
      <tr style="border-bottom:1px solid #eee;background:#fff8e6;"><td style="padding:10px 0;font-weight:bold;color:#1b2a52;font-size:18px;">סכום התרומה</td><td style="padding:10px 0;color:#c9a227;font-size:20px;font-weight:bold;">₪${amountStr}</td></tr>
      <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;font-weight:bold;color:#555;">תאריך ושעה</td><td style="padding:10px 0;color:#222;">${dateStr} ${timeStr}</td></tr>
      <tr><td style="padding:10px 0;font-weight:bold;color:#555;">מספר עסקה</td><td style="padding:10px 0;color:#222;">${ref}</td></tr>
    </table>
  </div>
</div>`;
  return await sendEmail(RABBI_EMAIL, subject, textBody, htmlBody);
}

function verifiedResponse(status: number, event: string) {
  return Response.json({ ok: status < 400, event }, { status, headers: { "Cache-Control": "no-store" } });
}

async function requestKesher(body: Record<string, unknown>) {
  const json = asRecord(body.Json);
  const credentials = { userName: KESHER_USER, password: KESHER_PASS };
  const response = await fetch(KESHER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json ? { ...body, Json: { ...json, ...credentials } } : { ...body, ...credentials }),
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    console.error("Kesher read API status:", response.status);
    throw new Error("Kesher lookup unavailable");
  }
  const result = await response.json();
  return typeof result === "string" ? JSON.parse(result) : result;
}

async function handleVerifiedWebsitePayment(payload: Record<string, unknown>) {
  const reference = transactionReference(payload);
  if (!reference) return verifiedResponse(200, "ignored");
  if (!KESHER_USER || !KESHER_PASS) return verifiedResponse(503, "verification_unavailable");

  let payment;
  try {
    payment = await findVerifiedPayment(reference, requestKesher, payload);
  } catch {
    console.warn("Kesher verification unavailable: contact lookup");
    return verifiedResponse(503, "verification_unavailable");
  }
  if (payment.state !== "confirmed") {
    console.info("Kesher verification:", payment.reason);
    return verifiedResponse(payment.state === "unavailable" ? 503 : 200,
      payment.state === "unavailable" ? "verification_unavailable" : "ignored");
  }

  const id = await websiteDonationId(reference);
  const { data: recorded, error: recordError } = await supabase.from("donations").upsert({
    id,
    external_payment_id: "kesher:" + reference,
    amount: payment.amount,
    currency: "ILS",
    project: payment.project,
    payment_method: "kesher",
    frequency: payment.recurring ? "monthly" : "one_time",
    status: "confirmed",
    donated_at: payment.date,
    confirmed_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true }).select("id").maybeSingle();
  if (recordError) {
    console.error("Verified Kesher donation could not be recorded:", recordError.code);
    return verifiedResponse(503, "recording_unavailable");
  }
  if (!recorded) return verifiedResponse(200, "already_recorded");

  const { error: donorError } = await supabase.from("donors").upsert({
    kesher_ref: reference,
    full_name: payment.fullName || null,
    first_name: payment.firstName || null,
    email: payment.email || null,
    phone: payment.phone || null,
    city: payment.city || null,
    amount: payment.amount,
    donation_date: payment.date,
    status: "פעיל",
  }, { onConflict: payment.email ? "email" : "kesher_ref", ignoreDuplicates: true });
  if (donorError) console.error("Verified Kesher donor could not be recorded:", donorError.code);

  const displayName = payment.firstName || payment.fullName || "התורם היקר";
  const message = DONATION_THANKS_MESSAGE
    .replace("{שם}", displayName)
    .replace("{סכום}", formatAmount(payment.amount));
  const safeMessage = message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const emailHtml = `<div dir="rtl">${safeMessage.replaceAll("\n", "<br>")}</div>`;
  const [email, whatsapp] = await Promise.all([
    payment.email && RESEND_API_KEY
      ? sendEmail(payment.email, "תודה על תרומתך למוסדות ישימך כאפרים", message, emailHtml).catch(() => ({ success: false }))
      : undefined,
    payment.phone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
      ? sendWhatsApp(payment.phone, message, Deno.env.get("TWILIO_KESHER_THANKS_CONTENT_SID")).catch(() => ({ success: false }))
      : undefined,
  ]);

  await trackDonationDelivery(supabase, reference, payment.amount, !donorError, email, whatsapp);
  return verifiedResponse(200, "confirmed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: CORS_HEADERS });
  }

  if (!asRecord(payload)) return new Response("Invalid JSON object", { status: 400, headers: CORS_HEADERS });
  if (/\/verified\/?$/.test(new URL(req.url).pathname) || asRecord(payload.Transaction)) {
    return handleVerifiedWebsitePayment(payload);
  }

  console.log("Received webhook:", JSON.stringify(payload));

  const kesherStatus = payload["KesherStatus"];
  const obligationStatus = payload["ObligationStatus"];

  // FLOW 1: Successful donation
  if (kesherStatus === 4 || kesherStatus === "4" || kesherStatus === 11 || kesherStatus === "11") {
    const sum = payload["Sum"] ?? payload["sum"];
    const tranRef = payload["TranReference"] ?? payload["tranReference"] ?? payload["TranRef"] ?? payload["tranRef"];
    const purpose = (payload["purpose"] as string) ?? null;
    const isAnonymous = payload["anonymous"] === true;

    let donorPhone: string | null = (payload["Phone"] as string) ?? null;
    let donorEmail: string | null = (payload["Mail"] as string) ?? null;
    let donorName: string | null = (payload["ReceiptName"] as string) ?? (payload["Name"] as string) ?? null;
    let donorFirstName: string | null = (payload["FirstName"] as string) ?? null;
    let donorCity: string | null = (payload["City"] as string) ?? null;

    if ((!donorEmail || !donorPhone) && tranRef) {
      try {
        const contact = await getContactFromGetTrans(String(tranRef), true);
        if (contact) {
          donorPhone = donorPhone ?? contact.phone;
          donorEmail = donorEmail ?? contact.email;
          donorName = donorName ?? contact.name;
          donorFirstName = donorFirstName ?? contact.firstName;
          donorCity = donorCity ?? contact.city;
        }
      } catch (err) {
        console.error("Error fetching GetTrans for donation:", err);
      }
    }

    const kesherRef = (tranRef as string) ?? (payload["ObligationReference"] as string) ?? undefined;
    const dbResult = await saveDonorToSupabase({
      kesherRef,
      fullName: isAnonymous ? "אנונימי" : donorName,
      firstName: isAnonymous ? null : donorFirstName,
      phone: donorPhone,
      email: donorEmail,
      city: donorCity,
      amount: sum ? parseFloat(String(sum)) : null,
      status: "פעיל",
      purpose,
    });

    const receiptNumber = dbResult?.data?.receipt_number ?? Math.floor(1000 + Math.random() * 9000);
    const displayName = isAnonymous ? "תורם יקר" : (donorFirstName ?? donorName ?? "התורם היקר");
    const amountStr = sum ? formatAmount(sum) : "?";
    const now = new Date();
    const dateStr = now.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

    const thanksMessage = DONATION_THANKS_MESSAGE
      .replace("{שם}", displayName)
      .replace("{סכום}", amountStr);

    const results: Record<string, unknown> = {};

    // Send WhatsApp thanks
    if (donorPhone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      try { results.whatsapp = await sendWhatsApp(donorPhone, thanksMessage); }
      catch (err) { results.whatsapp = { success: false, error: String(err) }; }
    }

    // Send receipt email
    if (donorEmail && RESEND_API_KEY) {
      try {
        const receiptHtml = buildReceiptHtml({
          name: displayName,
          amount: amountStr,
          purpose: purpose ?? undefined,
          receiptNumber,
          date: dateStr,
          tranRef: tranRef ? String(tranRef) : undefined,
        });
        results.email = await sendEmail(
          donorEmail,
          `קבלה #${receiptNumber} – תודה על תרומתך למוסדות ישימך כאפרים`,
          thanksMessage,
          receiptHtml
        );
      } catch (err) {
        results.email = { success: false, error: String(err) };
      }
    }

    // Large donation notify Rabbi
    const numericAmount = sum ? parseFloat(String(sum)) : 0;
    if (numericAmount >= LARGE_DONATION_THRESHOLD && RESEND_API_KEY) {
      try {
        results.rabbiNotification = await notifyRabbiLargeDonation({
          donorName: isAnonymous ? null : donorName,
          donorFirstName: isAnonymous ? null : donorFirstName,
          donorPhone,
          donorEmail,
          donorCity,
          amount: sum,
          tranRef: kesherRef,
        });
      } catch (err) {
        results.rabbiNotification = { success: false, error: String(err) };
      }
    }

    EdgeRuntime.waitUntil(trackDonationDelivery(
      supabase, tranRef, sum, !!dbResult?.data && !dbResult.error,
      results.email as Parameters<typeof trackDonationDelivery>[4],
      results.whatsapp as Parameters<typeof trackDonationDelivery>[5],
    ));

    return new Response(
      JSON.stringify({ ok: true, event: "donation", displayName, sum, receiptNumber, results }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // FLOW 2: Cancellation
  if (obligationStatus !== 8 && obligationStatus !== "8") {
    return new Response(JSON.stringify({ ok: true, action: "ignored" }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }

  const obligationRef = payload["ObligationReference"] as string | undefined;
  if (!obligationRef) return new Response(JSON.stringify({ ok: false, error: "No ObligationReference" }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });

  const today = new Date();
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(today.getFullYear() - 1);
  const formatDate = (d: Date) => `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;

  let donorPhone: string | null = null;
  let donorEmail: string | null = null;
  let donorName: string | null = null;
  let donorFirstName: string | null = null;
  let donorCity: string | null = null;

  try {
    const kesherRes = await fetch(KESHER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ func: "GetObligations", format: "json", fromDate: formatDate(oneYearAgo), toDate: formatDate(today), obligationRef, userName: KESHER_USER, password: KESHER_PASS }),
    });
    const kesherData = await kesherRes.json();
    const obligations = kesherData?.Obligation ?? kesherData?.obligation ?? [];
    if (obligations.length > 0) {
      const ob = obligations[0];
      donorPhone = ob.Phone ?? ob.phone ?? null;
      donorName = ob.Name ?? ob.name ?? null;
      donorFirstName = ob.FirstName ?? ob.firstName ?? null;
      donorCity = ob.City ?? ob.city ?? null;
    }
  } catch (err) { console.error("Error fetching GetObligations:", err); }

  if (!donorEmail || !donorPhone) {
    try {
      const contact = await getContactFromGetTrans(obligationRef, false);
      if (contact) {
        donorPhone = donorPhone ?? contact.phone;
        donorEmail = donorEmail ?? contact.email;
        donorName = donorName ?? contact.name;
        donorFirstName = donorFirstName ?? contact.firstName;
        donorCity = donorCity ?? contact.city;
      }
    } catch (err) { console.error("Error fetching GetTrans for cancellation:", err); }
  }

  donorPhone = donorPhone ?? (payload["Phone"] as string) ?? null;
  donorEmail = donorEmail ?? (payload["Mail"] as string) ?? null;
  donorName = donorName ?? (payload["Name"] as string) ?? null;
  donorFirstName = donorFirstName ?? (payload["FirstName"] as string) ?? null;

  await saveDonorToSupabase({ kesherRef: obligationRef, fullName: donorName, firstName: donorFirstName, phone: donorPhone, email: donorEmail, city: donorCity, amount: null, status: "מבוטל" });

  const displayName = donorFirstName ?? donorName ?? "התורם היקר";
  const message = CANCELLATION_MESSAGE.replace("{שם}", displayName);
  const results: Record<string, unknown> = {};

  if (donorEmail && RESEND_API_KEY) {
    try { results.email = await sendEmail(donorEmail, "תודה על תרומתך ושותפותך", message); }
    catch (err) { results.email = { success: false, error: String(err) }; }
  }
  if (donorPhone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    try { results.whatsapp = await sendWhatsApp(donorPhone, message); }
    catch (err) { results.whatsapp = { success: false, error: String(err) }; }
  }

  return new Response(
    JSON.stringify({ ok: true, event: "cancellation", obligationRef, displayName, results }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
