import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfigured, supabaseUrl } from "@/lib/config";
import { IntegrationUnavailable } from "@/lib/errors";
export async function supabaseServer() {
  if (!authConfigured()) throw new IntegrationUnavailable("account");
  const jar = await cookies();
  return createServerClient(
    supabaseUrl()!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (updates) => {
          try {
            updates.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server Components cannot set cookies. proxy.ts refreshes them. */
          }
        },
      },
    },
  );
}
