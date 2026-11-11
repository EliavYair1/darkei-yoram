type KesherRecord = Record<string, unknown>;

export const websitePaymentPages = new Map([
  ["184108", "החזקת הכוללים"],
  ["184106", "קופת החסד ראש העין"],
]);

export function asRecord(value: unknown): KesherRecord | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return;
  return value as KesherRecord;
}

function field(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function webhookTransaction(payload: KesherRecord) {
  return asRecord(payload.Transaction) ?? asRecord(payload.CrmTransaction) ?? payload;
}

function normalizedReference(value: unknown): string {
  const reference = field(value);
  return /^[0-9]{1,18}$/.test(reference) ? reference.replace(/^0+/, "") : "";
}

export function transactionReference(payload: KesherRecord): string {
  if (asRecord(payload.Transaction) && payload.Type !== undefined && field(payload.Type) !== "0") return "";
  return normalizedReference(webhookTransaction(payload).NumTransaction);
}

function transactionRows(value: unknown, depth = 0): KesherRecord[] {
  if (depth > 6) return [];
  if (Array.isArray(value)) return value.flatMap(item => transactionRows(item, depth + 1));
  const row = asRecord(value);
  if (!row) return [];
  if (row.NumTransaction !== undefined) return [row];
  return transactionRows(row.Transaction ?? row.TransactionResponseData ?? row.Trans ?? row.Data ?? row.Result, depth + 1);
}

type KesherRequest = (body: KesherRecord) => Promise<unknown>;

function transactionTime(value: unknown): number {
  const timestamp = field(value);
  const compact = timestamp.match(/^(\d{4})(\d{2})(\d{2})[ T](.+)$/);
  return Date.parse(compact ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}` : timestamp);
}

function reportForDay(timestamp: number) {
  const day = (offset: number) => new Date(timestamp + offset * 86_400_000).toISOString().slice(0, 10).replaceAll("-", "/");
  return { func: "GetTrans", format: "json", fromDate: day(-1), toDate: day(1) };
}

const pageNames = new Map([
  ["כולל אברכים ישימך כאפרים - דרכי יורם", "184108"],
  ["קופת החסד ראש העין", "184106"],
]);

export async function findVerifiedPayment(reference: string, request: KesherRequest, payload: KesherRecord = {}) {
  const match = (value: unknown) => transactionRows(value).find(row => normalizedReference(row.NumTransaction) === reference);
  const query = { func: "GetTranData", transactionNum: reference };
  // Older Kesher integrations use flat JSON. The new documentation also shows a Json envelope.
  const flat = await request({ ...query, format: "json" }).catch(() => undefined);
  let transaction = match(flat);
  if (!transaction) {
    const wrapped = await request({ Json: query, format: "json" }).catch(() => undefined);
    transaction = match(wrapped);
  }
  const callbackTime = transactionTime(webhookTransaction(payload).TransactionDate);
  if (!transaction && Number.isFinite(callbackTime) && Math.abs(Date.now() - callbackTime) < 7 * 86_400_000) {
    transaction = match(await request(reportForDay(callbackTime)).catch(() => undefined));
  }
  if (!transaction) return { state: "unavailable", reason: "transaction_lookup" } as const;

  const page = field(transaction.PaymentPage ?? transaction.PaymentPageNum);
  const pageName = field(transaction.PaymentPageName);
  const project = websitePaymentPages.get(page || pageNames.get(pageName) || pageName);
  if (!project) return { state: "ignored", reason: "outside_website_payment_pages" } as const;

  const status = field(transaction.Status);
  const code = field(asRecord(transaction.KesherStatus)?.Code ?? transaction.KesherStatus);
  const approved = ["4", "11"].includes(code) || ["עבר בהצלחה", "עברה בהצלחה", "העסקה עברה בהצלחה"].includes(status);
  const debit = ["debit", "חיוב", "חובה", "עסקת חיוב", "עסקת חובה"].includes(field(transaction.TransactionType).toLowerCase());
  const ils = ["1", "ILS", "NIS", "₪", "שקל", "שקלים", "שקל חדש", 'ש"ח', "ש״ח"].includes(field(transaction.Currency).toUpperCase());
  const minorAmount = Number(field(transaction.Total));
  const creditStatus = field(asRecord(transaction.CreditStatus)?.Code ?? transaction.CreditStatus);
  if (!approved || (code && !["4", "11"].includes(code)) || (creditStatus && !/^0+$/.test(creditStatus)) ||
      !debit || !ils || !Number.isSafeInteger(minorAmount) || minorAmount <= 0) {
    return { state: "ignored", reason: "not_an_approved_ils_debit" } as const;
  }

  const timestamp = transactionTime(transaction.TranDate ?? transaction.TransactionDate);
  if (!Number.isFinite(timestamp)) return { state: "unavailable", reason: "verified_transaction_date" } as const;
  const date = new Date(timestamp).toISOString();
  let contact = transaction;
  if (!field(contact.Mail ?? contact.Email) || !field(contact.Phone ?? contact.Phone2)) {
    const report = await request(reportForDay(timestamp));
    contact = match(report) ?? contact;
  }

  const firstName = field(contact.FirstName) || field(transaction.FirstName);
  const lastName = field(contact.LastName) || field(transaction.LastName);
  const fullName = field(contact.Name) || field(transaction.Name) || [firstName, lastName].filter(Boolean).join(" ");
  const email = (field(contact.Mail ?? contact.Email) || field(transaction.Mail ?? transaction.Email)).toLowerCase();
  const phone = field(contact.Phone ?? contact.Phone2) || field(transaction.Phone ?? transaction.Phone2);
  return {
    state: "confirmed",
    project,
    date,
    amount: minorAmount / 100,
    fullName,
    firstName,
    phone: /^\+?[0-9 ()-]{8,22}$/.test(phone) ? phone : "",
    email: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : "",
    city: field(contact.City) || field(transaction.City),
    recurring: !!field(transaction.ObligationReference),
  } as const;
}

export async function websiteDonationId(reference: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode("kesher-website-donation:" + reference),
  ));
  // The donation primary key is stable across repeated notifications for the same transaction.
  digest[6] = (digest[6] & 15) | 128;
  digest[8] = (digest[8] & 63) | 128;
  const hex = Array.from(digest.slice(0, 16), byte => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}
