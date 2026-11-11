type KesherDispatch = { success?: boolean; data?: { id?: unknown; sid?: unknown; code?: unknown } };

type DeliveryWriter = {
  from(table: string): {
    insert(row: Record<string, unknown>): {
      abortSignal(signal: AbortSignal): PromiseLike<{ error: { code?: string } | null }>;
    };
  };
};

export async function trackDonationDelivery(
  supabase: DeliveryWriter, reference: unknown, sum: unknown, donorSaved: boolean,
  email?: KesherDispatch, whatsapp?: KesherDispatch,
) {
  const transactionRef = typeof reference === "string" || typeof reference === "number"
    ? String(reference).trim() : "";
  if (!/^[a-zA-Z0-9._:/-]{1,120}$/.test(transactionRef)) return;
  const emailId = email?.data?.id;
  const whatsappId = whatsapp?.data?.sid;
  const acceptedEmail = !!email?.success && typeof emailId === "string";
  const acceptedWhatsapp = !!whatsapp?.success && typeof whatsappId === "string";
  const amount = typeof sum === "string" || typeof sum === "number" ? Number(sum) : NaN;
  const code = Number(whatsapp?.data?.code);
  try {
    const { error } = await supabase.from("kesher_delivery").insert({
      transaction_ref: transactionRef,
      amount: Number.isFinite(amount) && Math.abs(amount) < 1e10 ? amount : null,
      donor_saved: donorSaved,
      email_state: acceptedEmail ? "accepted" : email ? "failed" : "skipped",
      email_message_id: acceptedEmail ? emailId : null,
      whatsapp_state: acceptedWhatsapp ? "accepted" : whatsapp ? "failed" : "skipped",
      whatsapp_message_id: acceptedWhatsapp ? whatsappId : null,
      whatsapp_error_code: Number.isInteger(code) && code > 0 && code <= 2147483647 ? code : null,
    }).abortSignal(AbortSignal.timeout(3000));
    if (error) console.error("Kesher delivery tracking write failed:", error.code);
  } catch {
    console.error("Kesher delivery tracking write unavailable");
  }
}
