"use client";

import { useState } from "react";

type Delivery = { state: string; code?: number };
type Outcome = { email: Delivery; whatsapp: Delivery; receipt?: string };
type Scenario = "partner" | 18 | 1001;
const labels: Record<string, string> = {
  delivered: "נמסר לפי ספק השליחה",
  accepted: "התקבל אצל הספק · ממתין למסירה",
  rejected: "השליחה נכשלה",
  skipped: "לא נשלח בבדיקה הזו",
  unknown: "סטטוס מסירה לא זמין כרגע",
  unavailable: "שירות השליחה לא זמין",
};
const errors: Record<string, string> = {
  expired: "תוקף בדיקת המסירה פג.",
  phone: "שליחת WhatsApp זמינה לחשבון שמקושר למספר הבדיקה.",
  rate: "מכסת הבדיקות לשעה זו נוצלה.",
  forbidden: "יש להיכנס מחדש עם חשבון מנהל.",
};
const button = "inline-flex min-h-11 items-center justify-center rounded-full bg-[#374534] px-5 py-2 text-sm font-bold text-white hover:bg-[#293828] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50";

export function DonationTestPanel({ email, partnerEmail, defaultPartner, phoneLastFour, ready }: {
  email: string; partnerEmail: string; defaultPartner: boolean; phoneLastFour?: string; ready: boolean;
}) {
  const [scenario, setScenario] = useState<Scenario>(defaultPartner ? "partner" : 18);
  const [testedScenario, setTestedScenario] = useState<Scenario>(scenario);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function run(action: "send" | "status") {
    setBusy(true);
    setError("");
    if (action === "send") setOutcome(null);
    try {
      const response = await fetch("/admin/donation-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "status" ? { action, receipt: outcome?.receipt }
          : scenario === "partner" ? { action: "partner", name } : { action, amount: scenario, whatsapp }),
      });
      const data = await response.json() as Outcome & { error?: string };
      if (!response.ok) {
        setError(errors[data.error ?? ""] || "לא התקבלה תשובה מהשרת. בדקו בתיבה ובטלפון לפני שליחה חוזרת.");
        return;
      }
      if (!data.email || !data.whatsapp) throw new Error("missing_result");
      if (action === "send") {
        setTestedScenario(scenario);
        setOutcome(data);
      } else if (outcome) {
        setOutcome({
          email: data.email.state === "skipped" ? outcome.email : data.email,
          whatsapp: data.whatsapp.state === "skipped" ? outcome.whatsapp : data.whatsapp,
          receipt: outcome.receipt,
        });
      }
    } catch {
      setError("לא התקבלה תשובה מהשרת. בדקו בתיבה ובטלפון לפני שליחה חוזרת.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="partner-test" className="rounded-2xl border border-[#e8dfd2] bg-white px-6 py-5" aria-labelledby="donation-test-title">
      <h2 id="donation-test-title" className="text-xl font-bold">בדיקת הצטרפות ותרומה</h2>
      <p className="mt-2 text-[#5b584e]">שליחת הודעות בדיקה אמיתיות בלי חיוב ובלי הוספת תורם למאגר.</p>
      <p className="mt-1 text-sm text-[#5b584e]">מייל הבדיקה יישלח ל־<bdi>{scenario === "partner" ? partnerEmail : email}</bdi>.</p>
      {!ready && <p className="mt-3 text-[#8a3a32]">שירות הבדיקה טרם זמין.</p>}
      <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); void run("send"); }}>
        <fieldset disabled={busy || !ready} className="space-y-2">
          <legend className="mb-2 text-sm font-bold">בחרו תרחיש</legend>
          <label className="flex min-h-10 items-center gap-2"><input type="radio" name="test-scenario" checked={scenario === "partner"} onChange={() => setScenario("partner")} /> הצטרפות למועדון · כרטיס שותף במייל</label>
          <label className="flex min-h-10 items-center gap-2"><input type="radio" name="test-scenario" checked={scenario === 18} onChange={() => setScenario(18)} /> תרומה רגילה בסך 18 ₪ · מייל תודה</label>
          <label className="flex min-h-10 items-center gap-2"><input type="radio" name="test-scenario" checked={scenario === 1001} onChange={() => setScenario(1001)} /> תרומת VIP בסך 1,001 ₪ · תעודת הוקרה</label>
          {scenario === "partner" && (
            <label className="block max-w-sm text-sm font-bold">
              שם מלא שיופיע בכרטיס
              <input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} required
                className="mt-2 block min-h-11 w-full rounded-lg border border-[#b8b3a7] bg-white px-3 text-base font-normal" />
            </label>
          )}
          {scenario !== "partner" && phoneLastFour && (
            <div className="mt-3 rounded-xl bg-[#f7f3eb] p-3">
              <label className="flex min-h-9 items-center gap-2"><input type="checkbox" checked={whatsapp} onChange={event => setWhatsapp(event.target.checked)} /> שלחו גם WhatsApp למספר שמסתיים ב־{phoneLastFour}</label>
              <p className="text-sm text-[#5b584e]">לבדיקת WhatsApp, שלחו תחילה ״בדיקה״ מהטלפון שלכם לשולח העסקי. <a className="underline" href="https://wa.me/15553348081?text=%D7%91%D7%93%D7%99%D7%A7%D7%94" target="_blank" rel="noopener noreferrer">פתיחת השיחה עם המוסדות</a></p>
            </div>
          )}
        </fieldset>
        <button type="submit" className={button} disabled={busy || !ready}>
          {busy ? "בודק…" : scenario === "partner" ? "שליחת כרטיס בדיקה" : "שליחת הודעות בדיקה"}
        </button>
      </form>
      {error && <p className="mt-3 text-[#8a3a32]" role="alert">{error}</p>}
      {outcome && (
        <div className="mt-4 space-y-2 rounded-xl bg-[#f7f3eb] p-4" aria-live="polite">
          <p className="font-bold">{testedScenario === "partner" ? "תוצאות בדיקת הצטרפות"
            : `תוצאות הבדיקה לתרומה מדומה בסך ${testedScenario.toLocaleString("he-IL")} ₪`}</p>
          <ul className="space-y-1">
            <li>{testedScenario === "partner" ? "כרטיס שותף במייל" : testedScenario === 1001 ? "תעודת הוקרה במייל" : "מייל תודה"} · {labels[outcome.email.state]}{outcome.email.code ? ` (${outcome.email.code})` : ""}</li>
            {testedScenario !== "partner" && <li>אישור ב־WhatsApp · {labels[outcome.whatsapp.state]}{outcome.whatsapp.code ? ` (${outcome.whatsapp.code})` : ""}</li>}
          </ul>
          {outcome.whatsapp.code === 63016 && <p className="text-sm">שלחו ״בדיקה״ לשולח העסקי כדי לפתוח חלון שיחה לפני הניסיון הבא.</p>}
          {outcome.receipt && <button type="button" disabled={busy} onClick={() => void run("status")} className="min-h-11 font-bold text-[#374534] underline focus-visible:outline-2 disabled:opacity-50">רענון סטטוס מסירה</button>}
        </div>
      )}
    </section>
  );
}
