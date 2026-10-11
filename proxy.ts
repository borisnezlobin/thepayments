import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, supabaseUrl } from "@/lib/config";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (!authConfigured()) return response;
  const supabase = createServerClient(
    supabaseUrl()!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(updates, cacheHeaders) {
          updates.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          updates.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(cacheHeaders ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
          response.headers.set("Cache-Control", "private, no-store");
        },
      },
    },
  );
  await supabase.auth.getClaims();
  return response;
}
export const config = {
  matcher: [
    "/account/:path*",
    "/login",
    "/signup",
    "/agent/:path*",
    "/shops",
    "/s/:path*",
    "/orders/:path*",
    "/auth/:path*",
    "/api/buyer/:path*",
  ],
};
