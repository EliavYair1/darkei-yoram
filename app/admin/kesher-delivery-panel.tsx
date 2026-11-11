"use client";

import { useState } from "react";

type Delivery = { state: string; code?: number };
type DonorRecord = { donation_date: string | null; amount: number | null };
type Attempt = { recordedAt: string; amount: number | null; donorSaved: boolean; email: Delivery; whatsapp: Delivery };

const date = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });
const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" });
const labels: Record<string, string> = {
  accepted: "התקבל אצל ספק השליחה",
  delivered: "נמסר לפי הספק",
  failed: "השליחה נכשלה",
  rejected: "השליחה נכשלה",
  skipped: "לא בוצעה שליחה",
  unknown: "סטטוס מסירה לא זמין",
  unavailable: "סטטוס מסירה לא זמין",
};

function deliveryLabel(delivery: Delivery) {
  const label = labels[delivery.state] ?? labels.unknown;
  return delivery.code ? label + " (" + delivery.code + ")" : label;
}

export function KesherDeliveryPanel() {
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [donorRecord, setDonorRecord] = useState<DonorRecord | null>(null);

  async function check() {
    setBusy(true);
    setError(false);
    setAttempts(null);
    setDonorRecord(null);
    try {
      const response = await fetch("/admin/donation-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kesher", reference }),
      });
      const data = await response.json() as { attempts?: Attempt[]; donorRecord?: DonorRecord | null };
      if (!response.ok || !Array.isArray(data.attempts)) throw new Error("missing_result");
      setAttempts(data.attempts);
      setDonorRecord(data.donorRecord ?? null);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#e8dfd2] bg-white px-6 py-5" aria-labelledby="kesher-delivery-title">
      <h2 id="kesher-delivery-title" className="text-xl font-bold">מעקב אחרי תרומה בקשר</h2>
      <p className="mt-2 text-[#5b584e]">לאחר שקשר מציג אישור עסקה, הזינו את האסמכתה כדי לבדוק אם היא קיימת במאגר. פרטי מסירת ההודעות יופיעו כשיהיה דיווח מהחיבור לקשר.</p>
      <a href="/partners/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center font-bold text-[#374534] underline">לפתיחת עמוד ״שותפים איתנו״</a>
      <form className="mt-2 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void check(); }}>
        <label className="flex flex-col gap-1 text-sm font-bold">
          אסמכתת עסקה בקשר
          <input required maxLength={120} dir="ltr" value={reference} disabled={busy} onChange={event => {
            setReference(event.target.value);
            setAttempts(null);
            setDonorRecord(null);
            setError(false);
          }} className="min-h-11 rounded-lg border border-[#a9a498] px-3 font-normal focus-visible:outline-2" />
        </label>
        <button type="submit" disabled={busy || !reference.trim()} className="min-h-11 rounded-full bg-[#374534] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "בודק…" : "בדיקת אסמכתה"}
        </button>
      </form>
      <div className="mt-3" aria-live="polite">
        {error && <p className="text-[#8a3a32]">בדיקת האסמכתה לא הצליחה. בדקו את המספר ונסו שוב.</p>}
        {attempts?.length === 0 && !donorRecord && <p className="text-[#5b584e]">לא נמצאה רשומה במאגר עם האסמכתה הזו.</p>}
        {donorRecord && (
          <div className="space-y-1 rounded-xl bg-[#f7f3eb] p-4 text-sm">
            <p className="font-bold">האסמכתה מופיעה במאגר התורמים</p>
            {donorRecord.donation_date && <p>תאריך רשום · {date.format(new Date(donorRecord.donation_date))}</p>}
            {donorRecord.amount != null && <p>סכום רשום · {money.format(donorRecord.amount)}</p>}
            <p>אין דיווח מסירה עבור מייל או WhatsApp בעסקה הזו.</p>
          </div>
        )}
        {!!attempts?.length && (
          <ul className="space-y-3">
            {attempts.map((attempt, index) => (
              <li key={attempt.recordedAt + index} className="space-y-1 rounded-xl bg-[#f7f3eb] p-4 text-sm">
                <p className="font-bold">אירוע תרומה התקבל · {date.format(new Date(attempt.recordedAt))}{attempt.amount == null ? "" : " · " + money.format(attempt.amount)}</p>
                <p>רשומת תורם · {attempt.donorSaved ? "נשמרה" : "השמירה נכשלה"}</p>
                <p>מייל תודה · {deliveryLabel(attempt.email)}</p>
                <p>WhatsApp · {deliveryLabel(attempt.whatsapp)}</p>
                <p>תעודת VIP · מסלול קשר אינו מפיק תעודה</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
