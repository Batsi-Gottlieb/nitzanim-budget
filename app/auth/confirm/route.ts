import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IMPERSONATOR_COOKIE } from "@/lib/impersonation";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const returnAs = searchParams.get("return_as");
  const clearImpersonation = searchParams.get("clear_impersonation");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      if (returnAs) {
        response.cookies.set(IMPERSONATOR_COOKIE, returnAs, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 4,
        });
      }
      if (clearImpersonation) {
        response.cookies.delete(IMPERSONATOR_COOKIE);
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
