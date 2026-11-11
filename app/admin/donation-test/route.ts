import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getAutomationStaff } from "../staff";

const edgeUrl = "https://yyjdckgnaamfexdvigqk.supabase.co/functions/v1/donation-delivery-test";
const jsonHeaders = { "Cache-Control": "private, no-store" };
const encoder = new TextEncoder();
const toBytes = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

type Delivery = { state: string; code?: number; ref?: string };
type DeliveryPair = { email: Delivery; whatsapp: Delivery };
type Receipt = { user: string; expires: number; email?: string; whatsapp?: string };
const supportedStates = new Set(["delivered", "accepted", "skipped", "rejected", "unknown", "unavailable"]);

function respond(body: unknown, status = 200) {
  return Response.json(body, { status, headers: jsonHeaders });
}

function view({ state, code }: Delivery) {
  return { state, code };
}

async function signedEdge<T>(input: Record<string, unknown>, key: Uint8Array<ArrayBuffer>): Promise<T> {
  const body = JSON.stringify({ ...input, ts: Date.now() });
  const signer = await crypto.subtle.importKey("pkcs8", key, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signer, encoder.encode(body));
  const response = await fetch(edgeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Donation-Test-Signature": toBase64(new Uint8Array(sig)) },
    body,
    signal: AbortSignal.timeout(input.action === "partner" ? 18_000 : 12_000),
  });
  if (!response.ok) throw new Error("edge_status");
  return await response.json() as T;
}

async function callEdge(input: Record<string, unknown>, key: Uint8Array<ArrayBuffer>) {
  const result = await signedEdge<DeliveryPair>(input, key);
  if (!supportedStates.has(result.email?.state) || !supportedStates.has(result.whatsapp?.state)) {
    throw new Error("edge_response");
  }
  return result;
}

async function receiptKey(key: Uint8Array<ArrayBuffer>) {
  const seed = encoder.encode("darkei-yoram/donation-test-receipt:" + toBase64(key));
  const digest = await crypto.subtle.digest("SHA-256", seed);
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function seal(receipt: Receipt, key: Uint8Array<ArrayBuffer>) {
  const payload = toBase64(encoder.encode(JSON.stringify(receipt)));
  const tag = await crypto.subtle.sign("HMAC", await receiptKey(key), encoder.encode(payload));
  return payload + "." + toBase64(new Uint8Array(tag));
}

async function unseal(value: unknown, user: string, key: Uint8Array<ArrayBuffer>) {
  if (typeof value !== "string" || value.length > 1400) return null;
  try {
    const [payload, tag, extra] = value.split(".");
    if (!payload || !tag || extra !== undefined
      || !await crypto.subtle.verify("HMAC", await receiptKey(key), toBytes(tag), encoder.encode(payload))) return null;
    const receipt = JSON.parse(new TextDecoder().decode(toBytes(payload))) as Receipt;
    if (receipt.user !== user || receipt.expires <= Date.now()) return null;
    return receipt;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("Origin") !== new URL(request.url).origin) return respond({ error: "forbidden" }, 403);
  const staff = getAutomationStaff(await getChatGPTUser());
  if (!staff) return respond({ error: "forbidden" }, 403);
  if (!env.DONATION_TEST_SIGNING_KEY || !env.DB) return respond({ error: "unavailable" }, 503);

  try {
    const input = await request.json() as Record<string, unknown>;
    const key = toBytes(env.DONATION_TEST_SIGNING_KEY);
    const user = staff.user;
    if (input?.action === "kesher") {
      const reference = typeof input.reference === "string" ? input.reference.trim() : "";
      if (!/^[a-zA-Z0-9._:/-]{1,120}$/.test(reference)) return respond({ error: "invalid" }, 422);
      return respond(await signedEdge({ action: "kesher", reference }, key));
    }
    if (input?.action === "status") {
      const receipt = await unseal(input.receipt, user.userId, key);
      if (!receipt) return respond({ error: "expired" }, 422);
      const result = await callEdge({ action: "status", emailRef: receipt.email, whatsappRef: receipt.whatsapp }, key);
      return respond({ email: view(result.email), whatsapp: view(result.whatsapp) });
    }
    const partnerTest = input?.action === "partner";
    const name = typeof input?.name === "string" ? input.name.trim() : "";
    const validDonation = input?.action === "send" && (input.amount === 18 || input.amount === 1001)
      && typeof input.whatsapp === "boolean";
    if (partnerTest ? name.length < 2 || name.length > 80 : !validDonation) {
      return respond({ error: "invalid" }, 422);
    }

    const isOwner = user.email.trim().toLowerCase() === env.AUTOMATION_OWNER_EMAIL?.trim().toLowerCase();
    const isStaff = user.email.trim().toLowerCase() === env.AUTOMATION_STAFF_EMAIL?.trim().toLowerCase();
    const phone = isOwner ? env.DONATION_TEST_PHONE : isStaff && env.AUTOMATION_STAFF_PHONE === env.DONATION_TEST_PHONE
      ? env.DONATION_TEST_PHONE : undefined;
    if (!partnerTest && input.whatsapp && !phone) return respond({ error: "phone" }, 422);

    const hour = Math.floor(Date.now() / 3_600_000);
    const rate = await env.DB.prepare(`
      INSERT INTO contact_rate (hour, bucket, hits) VALUES (?1, ?2, 1)
      ON CONFLICT(hour, bucket) DO UPDATE SET hits = hits + 1
      WHERE hits < 4 RETURNING hits
    `).bind(hour, "donation-test:" + user.userId).first();
    if (!rate) return respond({ error: "rate" }, 429);

    const id = crypto.randomUUID();
    const result = await callEdge(partnerTest ? {
      action: "partner", email: env.AUTOMATION_STAFF_EMAIL?.trim() || user.email, name, id,
    } : {
      action: "send", amount: input.amount, email: user.email, name: user.fullName || "צוות דרכי יורם",
      phone: input.whatsapp ? phone : undefined, id,
    }, key);
    const receipt = result.email.ref || result.whatsapp.ref
      ? await seal({ user: user.userId, expires: Date.now() + 30 * 60_000, email: result.email.ref, whatsapp: result.whatsapp.ref }, key)
      : undefined;
    return respond({ email: view(result.email), whatsapp: view(result.whatsapp), receipt });
  } catch {
    return respond({ error: "unavailable" }, 503);
  }
}
