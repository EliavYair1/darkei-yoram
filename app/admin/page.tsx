import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "../chatgpt-auth";
import { checks, readCheckResults } from "./checks";
import { getAutomationStaff } from "./staff";
import { DonationTestPanel } from "./donation-test-panel";
import { KesherDeliveryPanel } from "./kesher-delivery-panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "מרכז בדיקות לצוות | דרכי יורם",
  robots: { index: false, follow: false },
};

const action = "inline-flex min-h-11 items-center justify-center rounded-full bg-[#374534] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#293828] focus-visible:outline-2 focus-visible:outline-offset-4";
const panel = "rounded-2xl border border-[#e8dfd2] bg-white px-6 py-5";

type CheckRun = { started_at: number; finished_at: number | null; results: string | null };

const flows = [
  ["פנייה חדשה", "שמירת פנייה מהאתר והפעלת הודעה למזכירות ואישור לפונה", "Resend ו־Twilio"],
  ["כרטיס שותף", "שליחת כרטיס במייל לאחר הוספת תורם עם כתובת מייל", "Resend"],
  ["תזכורת חודשית", "הרצה יומית לבדיקת התאמה ושליחת תזכורת", "Resend"],
  ["תורמים ותיקים", "בדיקה יומית ורבעונית לפי התזמונים הקיימים", "Twilio ו־Resend"],
  ["ימי הולדת", "הרצה יומית לאיתור ימי הולדת", "Twilio ו־Resend"],
  ["דו״ח חודשי לצוות", "סיכום פעילות התרומות לחודש הקודם", "Resend"],
  ["ברכות לחגים ועדכונים", "שליחה ידנית לפי הפעולה שנבחרה", "Twilio או Resend"],
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const defaultPartner = (await searchParams).test === "partner";
  const user = await getChatGPTUser();
  const staff = getAutomationStaff(user);

  let latest: CheckRun | null = null;
  let unavailable = false;
  if (staff) {
    try {
      if (!env.DB || !env.SUPABASE_CONTACT_KEY) throw new Error();
      latest = await env.DB.prepare("SELECT started_at, finished_at, results FROM automation_check WHERE id = 1")
        .first<CheckRun>();
    } catch {
      unavailable = true;
    }
  }
  const testPhone = env.DONATION_TEST_PHONE;
  const email = staff?.user.email.trim().toLowerCase();
  const canTestWhatsapp = !!testPhone && !!email && (
    email === env.AUTOMATION_OWNER_EMAIL?.trim().toLowerCase() ||
    (email === env.AUTOMATION_STAFF_EMAIL?.trim().toLowerCase() && env.AUTOMATION_STAFF_PHONE === testPhone)
  );
  const results = readCheckResults(latest?.results ?? null);
  const running = latest && latest.finished_at === null && Date.now() - latest.started_at < 60_000;

  return (
    <main className="min-h-screen bg-[#f7f3eb] px-5 py-8 text-[#292720] md:py-14">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-10 flex flex-wrap items-center justify-between gap-4 text-sm font-bold">
          <a className="text-[#475543] underline-offset-4 hover:underline" href="/">← חזרה לאתר דרכי יורם</a>
          {user && <a className="text-[#475543] underline-offset-4 hover:underline" href={chatGPTSignOutPath("/admin")} target="_top">יציאה</a>}
        </nav>
        <header className="mb-7">
          <p className="mb-3 text-sm font-bold text-[#5c694c]">ישימך כאפרים · דרכי יורם</p>
          <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">מרכז בדיקות לצוות</h1>
          <p className="max-w-xl text-base leading-7 text-[#5b584e]">בדיקת האוטומציות של המוסדות ותצוגת מצב של תהליכי השליחה.</p>
        </header>
        {!staff ? (
          <section className={panel}>
            <h2 className="mb-2 text-xl font-bold">{user ? "אין לחשבון הזה הרשאת מנהל" : "כניסת מנהלים"}</h2>
            <p className="mb-5 text-[#5b584e]">
              {user ? "צאו והיכנסו עם חשבון ChatGPT שמקושר לכתובת מייל מורשית."
                : "היכנסו עם חשבון ChatGPT שמקושר לכתובת מייל מורשית."}
            </p>
            {!user && <a className={action} href={chatGPTSignInPath(defaultPartner ? "/admin?test=partner" : "/admin")} target="_top">כניסה מאובטחת</a>}
          </section>
        ) : (
          <div className="space-y-6">
            <nav aria-label="ניהול המוסדות" className="flex flex-wrap gap-3">
              <a className={action} href="/admin/contacts">פניות ומסירה</a>
              <a className={action} href="/admin/donors">רשימת תורמים</a>
            </nav>
            <DonationTestPanel email={staff.user.email} phoneLastFour={canTestWhatsapp ? testPhone?.slice(-4) : undefined}
              partnerEmail={env.AUTOMATION_STAFF_EMAIL?.trim() || staff.user.email} defaultPartner={defaultPartner}
              ready={!!env.DONATION_TEST_SIGNING_KEY && !!env.DB} />
            <KesherDeliveryPanel />
            <section className={panel}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">הרצה יבשה ב־Supabase</h2>
                  <p className="mt-2 text-[#5b584e]">הבדיקה מפעילה את שלב החישוב ומציגה תוצאה מצטברת בלבד. היא לא שולחת הודעות.</p>
                  {staff.phoneLastFour && <p className="mt-2 text-sm text-[#5b584e]">מספר צוות מאושר המסתיים ב־{staff.phoneLastFour}</p>}
                </div>
                {!unavailable && (
                  <form method="post" action="/admin/test">
                    <button className={action} type="submit">הרצת בדיקות יבשות</button>
                  </form>
                )}
              </div>
              {unavailable && <p role="status" className="mt-4 text-[#8a3a32]">שירות הבדיקות אינו זמין כרגע.</p>}
              {running && <p role="status" className="mt-4 text-[#5b584e]">הבדיקה בתהליך. אפשר לרענן את הדף בעוד כמה שניות.</p>}
              {latest?.finished_at && (
                <p className="mt-5 text-sm text-[#5b584e]">
                  בדיקה אחרונה · {new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(latest.finished_at)}
                </p>
              )}
              <ul className="mt-4 divide-y divide-[#e8dfd2]" aria-label="תוצאות הבדיקות">
                {checks.map(check => {
                  const result = results.find(item => item.slug === check.slug);
                  return (
                    <li key={check.slug} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <span className="font-medium">{check.title}</span>
                      <span className={result?.ok ? "text-sm font-bold text-[#425c37]" : "text-sm text-[#5b584e]"}>
                        {result ? result.ok ? result.count === null ? "החישוב עבר" : `החישוב עבר · ${result.count} התאמות` : "הבדיקה נכשלה" : "טרם נרשמה תוצאה"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className={panel}>
              <h2 className="mb-2 text-xl font-bold">האוטומציות הקיימות</h2>
              <ul className="divide-y divide-[#e8dfd2]">
                {flows.map(([title, description, provider]) => (
                  <li key={title} className="flex flex-wrap items-start justify-between gap-3 py-4">
                    <div>
                      <p className="font-bold">{title}</p>
                      <p className="mt-1 text-sm text-[#5b584e]">{description}</p>
                    </div>
                    <span className="rounded-full bg-[#eef0e8] px-3 py-1 text-sm font-semibold text-[#475543]">{provider}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
