import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { checks, previewAutomation } from "../checks";
import { getAutomationStaff } from "../staff";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const noStore = { "Cache-Control": "private, no-store" };
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403, headers: noStore });
  }
  if (!getAutomationStaff(await getChatGPTUser())) return new Response(null, { status: 403, headers: noStore });
  const { DB: db, SUPABASE_CONTACT_KEY: key } = env;
  if (!db || !key) return new Response("שירות הבדיקות אינו זמין כרגע", { status: 503, headers: noStore });

  const redirect = new Response(null, { status: 303, headers: { ...noStore, Location: "/admin" } });
  const started = Date.now();
  const claimed = await db.prepare(`
    INSERT INTO automation_check (id, started_at, finished_at, results)
    VALUES (1, ?1, NULL, NULL)
    ON CONFLICT(id) DO UPDATE SET started_at = excluded.started_at, finished_at = NULL, results = NULL
    WHERE automation_check.started_at <= ?2
    RETURNING id
  `).bind(started, started - 60_000).first();
  if (!claimed) return redirect;

  const results = await Promise.all(checks.map(check => previewAutomation(check, key)));
  await db.prepare("UPDATE automation_check SET finished_at = ?, results = ? WHERE id = 1 AND started_at = ?")
    .bind(Date.now(), JSON.stringify(results), started).run();
  return redirect;
}
