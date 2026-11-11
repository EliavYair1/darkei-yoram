declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
const from = "מוסדות ישימך כאפרים <noreply@yesimchakeefraim.co.il>";
const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const dbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
const donorId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailAddress = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const joinDateFormat = new Intl.DateTimeFormat("he-IL", {
  year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Jerusalem",
});

function reply(status: number, result: Record<string, unknown>) {
  return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
}

async function authorized(request: Request, payload: string) {
  const signature = request.headers.get("X-Partner-Card-Signature") ?? "";
  const issuedAt = request.headers.get("X-Partner-Card-Issued-At") ?? "";
  if (!/^[0-9a-f]{64}$/.test(signature) || !/^\d{10}$/.test(issuedAt) ||
      Math.abs(Date.now() / 1000 - Number(issuedAt)) > 600 || !projectUrl || !serviceKey) return false;

  const response = await fetch(`${projectUrl}/rest/v1/rpc/verify_partner_card_webhook`, {
    method: "POST",
    headers: dbHeaders,
    body: JSON.stringify({ payload, signature, issued_at: Number(issuedAt) }),
    signal: AbortSignal.timeout(3000),
  });
  return response.ok && await response.json() === true;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character,
  );
}

type Donor = {
  id?: unknown;
  email?: unknown;
  first_name?: unknown;
  full_name?: unknown;
  kesher_ref?: unknown;
  created_at?: unknown;
};

Deno.serve(async request => {
  if (request.method !== "POST") return reply(405, { error: "method" });
  let payload: { donor_id?: unknown; test_record?: Donor } | null;
  try {
    const envelope = await request.json() as { payload?: unknown } | null;
    if (typeof envelope?.payload !== "string" || envelope.payload.length > 3000) {
      return reply(400, { error: "invalid_payload" });
    }
    if (!await authorized(request, envelope.payload)) return reply(403, { error: "forbidden" });
    payload = JSON.parse(envelope.payload);
  } catch {
    return reply(400, { error: "invalid_request" });
  }
  if (!resendKey) return reply(503, { error: "unavailable" });

  const test = payload?.test_record !== undefined;
  let record = payload?.test_record;
  if (!test) {
    const id = payload?.donor_id;
    if (typeof id !== "string" || !donorId.test(id)) return reply(422, { error: "invalid_donor" });
    try {
      const query = new URLSearchParams({
        id: `eq.${id}`, select: "id,full_name,first_name,email,kesher_ref,created_at", limit: "1",
      });
      const response = await fetch(`${projectUrl}/rest/v1/donors?${query}`, {
        headers: dbHeaders, signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return reply(502, { error: "donor_lookup_failed" });
      const matches = await response.json() as Donor[];
      record = matches[0];
    } catch {
      return reply(502, { error: "donor_lookup_failed" });
    }
  }
  const email = typeof record?.email === "string" ? record.email.trim() : "";
  if (!record || typeof record.id !== "string" || !donorId.test(record.id) ||
      email.length > 254 || !emailAddress.test(email)) {
    return reply(422, { error: "invalid_donor" });
  }

  const name = typeof record.full_name === "string" ? record.full_name.trim() : "";
  const first = (typeof record.first_name === "string" ? record.first_name.trim() : "") ||
    name.split(/\s+/)[0] || "שותף יקר";
  const memberNumber = typeof record.kesher_ref === "string" && record.kesher_ref.trim()
    ? record.kesher_ref.trim() : record.id;
  const joinDate = typeof record.created_at === "string" ? Date.parse(record.created_at) : NaN;
  const html = buildCardEmail(
    escapeHtml(first), escapeHtml(name || first), escapeHtml(memberNumber),
    joinDateFormat.format(Number.isFinite(joinDate) ? joinDate : Date.now()), test,
  );

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `partner-card/${test ? "test" : "donor"}/${record.id}`,
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from,
        to: [email],
        subject: `${test ? "[בדיקת אתר] " : ""}🌟 ברוכים הבאים לשותפות — ישימך כאפרים`,
        html,
      }),
    });

    const result = await response.json() as { id?: unknown } | null;
    return response.ok && typeof result?.id === "string"
      ? reply(200, { success: true, email_id: result.id })
      : reply(502, { error: "email_rejected", provider_status: response.status });
  } catch {
    return reply(502, { error: "email_unavailable" });
  }
});

function buildCardEmail(firstName: string, fullName: string, memberNumber: string | number, joinDate: string, test: boolean): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>כרטיס שותף — ישימך כאפרים</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1eb;font-family:Arial,Helvetica,sans-serif;direction:rtl;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f1eb;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Card Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

          ${test ? '<tr><td style="padding:12px;text-align:center;background:#fff3d6;color:#60441d;font-size:14px;font-weight:bold;">כרטיס בדיקה · להמחשה בלבד</td></tr>' : ''}
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a4731 0%,#2d6a4f 60%,#40916c 100%);padding:40px 32px 32px;text-align:center;">
              <p style="margin:0 0 8px;color:#d4af37;font-size:13px;letter-spacing:3px;text-transform:uppercase;">ישימך כאפרים</p>
              <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:1px;">כרטיס שותף</h1>
              <p style="margin:12px 0 0;color:#a8d5b5;font-size:15px;">Partner Card</p>
              <!-- Decorative line -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                <tr>
                  <td style="border-top:1px solid rgba(212,175,55,0.4);">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold accent bar -->
          <tr>
            <td style="background:linear-gradient(90deg,#d4af37,#f0d060,#d4af37);height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px 24px;text-align:right;">
              <p style="margin:0 0 6px;color:#666;font-size:14px;">שלום,</p>
              <h2 style="margin:0 0 20px;color:#1a4731;font-size:26px;font-weight:700;">${firstName} 👋</h2>
              <p style="margin:0;color:#444;font-size:16px;line-height:1.7;">ברוכים הבאים לשותפות! אנו שמחים שהצטרפתם למשפחת <strong>ישימך כאפרים</strong>. שותפותכם היא עמוד תווך בכל מה שאנו עושים.</p>
            </td>
          </tr>

          <!-- Member details card -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f5ef;border-radius:12px;border:1px solid #e8dfc8;overflow:hidden;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 16px;color:#1a4731;font-size:13px;font-weight:700;letter-spacing:2px;">פרטי השותפות</p>

                    <!-- Row: Full name -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                      <tr>
                        <td style="color:#888;font-size:13px;width:40%;">שם מלא</td>
                        <td style="color:#1a1a1a;font-size:15px;font-weight:600;">${fullName}</td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                      <tr><td style="border-top:1px solid #e0d5c0;height:1px;font-size:0;"></td></tr>
                    </table>

                    <!-- Row: Member number -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                      <tr>
                        <td style="color:#888;font-size:13px;width:40%;">מספר שותף</td>
                        <td style="color:#d4af37;font-size:18px;font-weight:700;">${memberNumber}</td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                      <tr><td style="border-top:1px solid #e0d5c0;height:1px;font-size:0;"></td></tr>
                    </table>

                    <!-- Row: Join date -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="color:#888;font-size:13px;width:40%;">תאריך הצטרפות</td>
                        <td style="color:#1a1a1a;font-size:15px;">${joinDate}</td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quote -->
          <tr>
            <td style="background:#1a4731;padding:28px 40px;text-align:center;">
              <p style="margin:0;color:#d4af37;font-size:18px;font-style:italic;line-height:1.6;">&#x201C;וְיָשִׂימְךָ כְּאֶפְרַיִם וְכִמְנַשֶּׁה&#x201D;</p>
              <p style="margin:8px 0 0;color:#a8d5b5;font-size:13px;">בראשית מח, כ</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f5ef;padding:20px 40px;text-align:center;border-top:3px solid #d4af37;">
              <p style="margin:0;color:#888;font-size:12px;line-height:1.6;">ישימך כאפרים &nbsp;|&nbsp; yesimchakeefraim.co.il</p>
              <p style="margin:6px 0 0;color:#aaa;font-size:11px;">קיבלתם מייל זה כיוון שנרשמתם כשותפים במוסד.</p>
            </td>
          </tr>

        </table>
        <!-- End Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}
