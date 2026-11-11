import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "../../chatgpt-auth";
import { readSiteData } from "../site-data";
import { getAutomationStaff } from "../staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "רשימת תורמים | דרכי יורם",
  robots: { index: false, follow: false },
};

const pageSize = 25;
const date = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeZone: "Asia/Jerusalem" });
const amount = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });
const pageLink = "inline-flex min-h-11 items-center rounded-full border border-[#d8d1c5] px-4 font-bold text-[#374534] hover:bg-[#eef0e8]";
type Donor = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  amount: number | null;
  donation_date: string | null;
  status: string | null;
};

export default async function DonorsPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  if (!getAutomationStaff(await getChatGPTUser())) redirect("/admin");

  const { page } = await searchParams;
  const value = typeof page === "string" && /^\d{1,5}$/.test(page) ? Number(page) : 1;
  const currentPage = Math.min(10001, Math.max(value, 1));
  const offset = (currentPage - 1) * pageSize;
  const data = await readSiteData<{ rows: Donor[]; total: number | null }>(
    new URLSearchParams({ view: "donors", offset: String(offset) }),
  );
  const rows = data?.rows.slice(0, pageSize) ?? [];

  return (
    <main className="min-h-screen bg-[#f7f3eb] px-5 py-8 text-[#292720] md:py-14">
      <div className="mx-auto max-w-5xl">
        <a href="/admin" className="text-sm font-bold text-[#475543] underline-offset-4 hover:underline">← חזרה לאזור הניהול</a>
        <h1 className="mt-7 text-4xl font-bold tracking-tight md:text-5xl">רשימת תורמים</h1>
        {data?.total != null && (
          <p className="mt-3 text-[#5b584e]">{amount.format(data.total)} רשומות במאגר</p>
        )}
        {!data && <p role="status" className="mt-6 rounded-2xl bg-white p-5 text-[#8a3a32]">לא הצלחנו לטעון את רשימת התורמים. אפשר לרענן ולנסות שוב.</p>}
        {data && !rows.length && <p className="mt-6 rounded-2xl bg-white p-5">אין רשומות בעמוד הזה.</p>}
        {rows.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#e8dfd2] bg-white">
            <div aria-hidden="true" className="hidden grid-cols-[1.3fr_1.8fr_1fr_0.8fr] gap-4 bg-[#eef0e8] px-5 py-3 text-sm font-bold text-[#374534] md:grid">
              <span>תורם</span><span>פרטי קשר</span><span>תרומה רשומה</span><span>סטטוס</span>
            </div>
            <ul className="divide-y divide-[#e8dfd2]" aria-label="תורמים">
              {rows.map(donor => (
                <li key={donor.id}>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-sm md:grid-cols-[1.3fr_1.8fr_1fr_0.8fr]">
                    <div className="col-span-2 min-w-0 md:col-span-1">
                      <dt className="sr-only">תורם</dt>
                      <dd className="break-words text-base font-bold">{donor.full_name || "ללא שם"}</dd>
                    </div>
                    <div className="col-span-2 min-w-0 md:col-span-1">
                      <dt className="sr-only">פרטי קשר</dt>
                      <dd className="space-y-1">
                        {donor.phone && <div><bdi>{donor.phone}</bdi></div>}
                        {donor.email && <div className="break-all text-[#5b584e]"><bdi>{donor.email}</bdi></div>}
                        {!donor.phone && !donor.email && "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-xs text-[#5b584e] md:sr-only">תרומה רשומה</dt>
                      <dd className="space-y-1">
                        <div>{donor.amount != null ? amount.format(donor.amount) : "—"}</div>
                        {donor.donation_date && <div className="text-[#5b584e]">{date.format(new Date(donor.donation_date))}</div>}
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-xs text-[#5b584e] md:sr-only">סטטוס</dt>
                      <dd><span className="inline-block rounded-full bg-[#eef0e8] px-3 py-1 text-xs font-semibold text-[#374534]">{donor.status === "active" ? "פעיל" : donor.status || "—"}</span></dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data && (
          <nav aria-label="עמודי רשימת התורמים" className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            {currentPage > 1 && <a className={pageLink} href={`?page=${currentPage - 1}`}>העמוד הקודם</a>}
            <span className="font-medium text-[#5b584e]">עמוד {currentPage}</span>
            {data.rows.length > pageSize && currentPage < 10001 && <a className={pageLink} href={`?page=${currentPage + 1}`}>העמוד הבא</a>}
          </nav>
        )}
      </div>
    </main>
  );
}
