import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<{ userId: string; profile: Profile | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { userId: user.id, profile: profile as Profile | null };
}
