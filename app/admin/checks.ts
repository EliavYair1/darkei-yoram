export const checks = [
  { slug: "monthly-report", title: "דו״ח חודשי" },
  { slug: "dormant-reminder", title: "תזכורת לתורמים ותיקים" },
  { slug: "birthday-wishes", title: "ברכות יום הולדת" },
] as const;

type Check = (typeof checks)[number];

export type CheckResult = {
  slug: Check["slug"];
  ok: boolean;
  count: number | null;
};

const functionsUrl = "https://yyjdckgnaamfexdvigqk.supabase.co/functions/v1";

export async function previewAutomation(check: Check, apiKey: string): Promise<CheckResult> {
  const failure: CheckResult = { slug: check.slug, ok: false, count: null };
  try {
    const result = await fetch(`${functionsUrl}/${check.slug}?dry_run=true`, {
      headers: { apikey: apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!result.ok) return failure;
    const payload: unknown = await result.json();
    if (!payload || typeof payload !== "object") return failure;

    switch (check.slug) {
      case "monthly-report":
        if ("monthName" in payload && typeof payload.monthName === "string" && "monthlyTotal" in payload) {
          return { ...failure, ok: true };
        }
        break;
      case "dormant-reminder":
        if ("dry_run" in payload && payload.dry_run === true &&
            "after_dedup" in payload && typeof payload.after_dedup === "number") {
          return { ...failure, ok: true, count: payload.after_dedup };
        }
        break;
      case "birthday-wishes":
        if ("birthdays" in payload && Array.isArray(payload.birthdays)) {
          return { ...failure, ok: true, count: payload.birthdays.length };
        }
        break;
    }
  } catch {
    // The upstream payload can contain personal data. Retain only the summary.
  }
  return failure;
}

export function readCheckResults(value: string | null): CheckResult[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as CheckResult[];
  } catch {
    return [];
  }
}
