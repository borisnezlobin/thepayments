import "server-only";
import { createClient } from "@supabase/supabase-js";
import { agentLinksConfigured, supabaseUrl } from "@/lib/config";
import { IntegrationUnavailable } from "@/lib/errors";
export function supabaseAdmin() {
  if (!agentLinksConfigured()) throw new IntegrationUnavailable("account");
  return createClient(supabaseUrl()!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
