import { ensureBuyer } from "@/lib/buyer/profile";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { appOrigin, authConfigured } from "@/lib/config";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token_hash = params.get("token_hash");
  // Email confirmation only: never accept arbitrary OTP operations from the URL.
  if (token_hash && params.get("type") === "email" && authConfigured()) {
    const { data, error } = await (
      await supabaseServer()
    ).auth.verifyOtp({ token_hash, type: "email" });
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
