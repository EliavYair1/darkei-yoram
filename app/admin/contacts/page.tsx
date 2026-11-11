import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "../../chatgpt-auth";
import { readSiteData } from "../site-data";
import { getAutomationStaff } from "../staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "פניות ומסירה | דרכי יורם",
  robots: { index: false, follow: false },
};

const date = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });
const states: Record<string, [string, string]> = {
  delivered: ["נמסר", "bg-[#e7f0e4] text-[#31542d]"],
  accepted: ["התקבל אצל הספק", "bg-[#edf0f4] text-[#34435b]"],
  pending: ["בטיפול", "bg-[#edf0f4] text-[#34435b]"],
  template_pending: ["ממתין לאישור תבנית", "bg-[#fcf0d8] text-[#714600]"],
  failed: ["השליחה נכשלה", "bg-[#f9e6e3] text-[#8a3a32]"],
  skipped: ["ללא הסכמה ל־WhatsApp", "bg-[#f0ede8] text-[#5b584e]"],
  unknown: ["המסירה טרם אומתה", "bg-[#f0ede8] text-[#5b584e]"],
};
const templateStatus: Record<string, string> = {
  approved: "התבנית מאושרת",
  unsubmitted: "התבנית טרם הוגשה לאישור",
  pending: "התבנית בבדיקת WhatsApp",
  received: "התבנית בבדיקת WhatsApp",
  rejected: "WhatsApp דחתה את התבנית",
  paused: "התבנית מושהית",
  disabled: "התבנית מושבתת",
};
type Delivery = {
  contact_id: string;
  created_at: string;
  email_status: string;
  whatsapp_status: string;
  contacts: { full_name: string | null } | null;
};

function ChannelStatus({ state }: { state: string }) {
  const [label, color] = states[state] ?? states.unknown;
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${color}`}>{label}</span>;
}

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ verify?: string | string[] }> }) {
  if (!getAutomationStaff(await getChatGPTUser())) redirect("/admin");

  const { verify } = await searchParams;
  const query = new URLSearchParams({ view: "deliveries" });
  if (typeof verify === "string" && /^[0-9a-f-]{36}$/i.test(verify)) query.set("verify", verify);
  const data = await readSiteData<{ rows: Delivery[]; template: string }>(query);

  return (
    <main className="min-h-screen bg-[#f7f3eb] px-5 py-8 text-[#292720] md:py-14">
      <div className="mx-auto max-w-4xl">
        <a href="/admin" className="text-sm font-bold text-[#475543] underline-offset-4 hover:underline">← חזרה לאזור הניהול</a>
        <h1 className="mt-7 text-4xl font-bold tracking-tight md:text-5xl">פניות ומסירה</h1>
        <p className="mt-3 leading-7 text-[#5b584e]">פניות שנקלטו בטופס ואישור הקבלה שנשלח לכל פונה.</p>
        {data && (
          <p className="mt-5 rounded-xl border border-[#e8dfd2] bg-white px-4 py-3 text-sm">
            <strong>תבנית WhatsApp</strong> · {templateStatus[data.template] ?? "סטטוס האישור לא זמין כרגע"}
          </p>
        )}
        {!data && <p role="status" className="mt-6 rounded-2xl bg-white p-5 text-[#8a3a32]">לא הצלחנו לטעון את סטטוס הפניות. אפשר לרענן ולנסות שוב.</p>}
        {data && !data.rows.length && <p className="mt-6 rounded-2xl border border-[#e8dfd2] bg-white p-5">פניות חדשות יופיעו כאן לאחר שליחה מהטופס באתר.</p>}
        {data && data.rows.length > 0 && (
          <ul className="mt-6 space-y-3" aria-label="פניות אחרונות">
            {data.rows.map(row => (
              <li key={row.contact_id} className="rounded-2xl border border-[#e8dfd2] bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold">{row.contacts?.full_name || "פנייה מהאתר"}</h2>
                  <time dateTime={row.created_at} className="text-sm text-[#5b584e]">{date.format(new Date(row.created_at))}</time>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div><dt className="mb-1 text-sm font-bold">טופס</dt><dd><span className="inline-block rounded-full bg-[#e7f0e4] px-3 py-1 text-xs font-bold text-[#31542d]">נקלט</span></dd></div>
                  <div><dt className="mb-1 text-sm font-bold">מייל</dt><dd><ChannelStatus state={row.email_status} /></dd></div>
                  <div><dt className="mb-1 text-sm font-bold">WhatsApp</dt><dd><ChannelStatus state={row.whatsapp_status} /></dd></div>
                </dl>
                {(row.email_status === "accepted" || row.whatsapp_status === "accepted") && (
                  <a href={`?verify=${row.contact_id}`} className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-[#475543] underline underline-offset-4">בדיקת מסירה</a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
