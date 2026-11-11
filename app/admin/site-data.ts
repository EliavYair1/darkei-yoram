import { env } from "cloudflare:workers";

export const siteContactsUrl = "https://yyjdckgnaamfexdvigqk.supabase.co/functions/v1/darkei-site-contacts";

export async function readSiteData<T>(params: URLSearchParams): Promise<T | null> {
  if (!env.DARKEI_SITE_API_KEY) return null;
  try {
    const response = await fetch(`${siteContactsUrl}?${params}`, {
      headers: { "X-Darkei-Site-Key": env.DARKEI_SITE_API_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(16000),
    });
    return response.ok ? await response.json() as T : null;
  } catch {
    return null;
  }
}
