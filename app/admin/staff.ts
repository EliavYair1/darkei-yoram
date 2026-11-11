import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../chatgpt-auth";

export function getAutomationStaff(user: ChatGPTUser | null) {
  const email = user?.email.trim().toLowerCase();
  const staffEmail = env.AUTOMATION_STAFF_EMAIL?.trim().toLowerCase();
  const rabbiEmail = env.AUTOMATION_RABBI_EMAIL?.trim().toLowerCase();
  const ownerEmail = env.AUTOMATION_OWNER_EMAIL?.trim().toLowerCase();
  if (!user || !email || ![staffEmail, rabbiEmail, ownerEmail].includes(email)) return null;
  return {
    user,
    phoneLastFour: email === staffEmail ? env.AUTOMATION_STAFF_PHONE?.slice(-4) : undefined,
  };
}
