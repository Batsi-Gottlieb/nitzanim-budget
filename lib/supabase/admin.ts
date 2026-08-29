import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only; never import from a client component.
 * Used for admin-provisioned actions (e.g. creating client user accounts) that
 * can't go through the public signUp flow (email confirmation / rate limits).
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
