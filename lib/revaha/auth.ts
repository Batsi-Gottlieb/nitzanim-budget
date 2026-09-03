import { createClient } from "@/lib/supabase/server";
import { RevahaProfile } from "@/lib/revaha/types";

export async function getCurrentRevahaProfile(): Promise<{ userId: string; profile: RevahaProfile | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles_revaha").select("*").eq("id", user.id).maybeSingle();
  return { userId: user.id, profile: profile as RevahaProfile | null };
}
