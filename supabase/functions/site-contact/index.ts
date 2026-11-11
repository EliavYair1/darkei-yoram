import { handleSiteContact } from "../_shared/site-contacts.ts";

Deno.serve(request => {
  if (request.method !== "POST") {
    return Response.json({ error: "method" }, { status: 405, headers: { "Cache-Control": "no-store" } });
  }
  return handleSiteContact(request);
});
