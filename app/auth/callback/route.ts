import { ensureBuyer } from "@/lib/buyer/profile";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { appOrigin, authConfigured } from "@/lib/config";
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code && authConfigured()) {
    const { data, error } = await (
      await supabaseServer()
    ).auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      try {
        await ensureBuyer(data.user);
      } catch {
        return NextResponse.redirect(
          `${appOrigin()}/login?error=Sign+in+again+to+finish+buyer+setup.`,
        );
      }
      return NextResponse.redirect(`${appOrigin()}/account`);
    }
  }
  return NextResponse.redirect(
    `${appOrigin()}/login?error=Email+confirmation+failed.+Request+a+new+link.`,
  );
}
