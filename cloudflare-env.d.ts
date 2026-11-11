declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SUPABASE_CONTACT_KEY?: string;
    SUPABASE_ANON_KEY?: string;
    CONTACT_RATE_SALT?: string;
    DARKEI_SITE_API_KEY?: string;
    AUTOMATION_STAFF_EMAIL?: string;
    AUTOMATION_RABBI_EMAIL?: string;
    AUTOMATION_OWNER_EMAIL?: string;
    AUTOMATION_STAFF_PHONE?: string;
    DONATION_TEST_SIGNING_KEY?: string;
    DONATION_TEST_PHONE?: string;
  }
}
