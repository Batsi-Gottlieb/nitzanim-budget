"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";

function randomPassword() {
  return randomBytes(9).toString("base64url") + "A1!";
}

async function requireSuperAdmin() {
  const session = await getCurrentRevahaProfile();
  if (session?.profile?.role !== "admin") {
    throw new Error("פעולה זו זמינה לסופר-אדמין בלבד");
  }
  return session;
}

/**
 * Adds another super-admin. A brand-new login is created with a random password (shown once). If the
 * email already has a login (e.g. from another system on the same account), that login is simply
 * granted admin access here and keeps its existing password.
 */
export async function addRevahaAdmin(formData: FormData) {
  await requireSuperAdmin();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const full_name = ((formData.get("full_name") as string) || "").trim() || null;
  if (!email) return { error: "יש להזין כתובת אימייל" };

  const adminClient = createAdminClient();
  const password = randomPassword();
  let userId: string | null = null;
  let existingLogin = false;

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (createError && /already|exists|registered/i.test(`${createError.code ?? ""} ${createError.message}`)) {
    const { data: list, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return { error: listError.message };
    const found = list.users.find((u) => u.email?.toLowerCase() === email);
    if (!found) return { error: "המשתמש קיים אך לא אותר. נסו שוב" };
    userId = found.id;
    existingLogin = true;
  } else {
    return { error: createError?.message ?? "יצירת המשתמש נכשלה" };
  }

  const supabase = await createClient();
  const { data: existingProfile } = await supabase.from("profiles_revaha").select("id, role").eq("id", userId).maybeSingle();
  if (existingProfile) {
    return {
      error:
        existingProfile.role === "admin"
          ? "משתמש זה כבר מוגדר כאדמין"
          : "משתמש זה כבר משויך למערכת הרווחה בתפקיד אחר (ארגון/חברה). יש להסירו משם לפני הפיכתו לאדמין",
    };
  }

  const { error: insertError } = await supabase
    .from("profiles_revaha")
    .insert({ id: userId, role: "admin", organization_id: null, reseller_company_id: null, full_name, email });
  if (insertError) return { error: insertError.message };

  revalidatePath("/revaha/admin/admins");
  return { error: null, id: userId!, email, full_name, password: existingLogin ? null : password, existingLogin };
}

export async function resetRevahaAdminPassword(userId: string) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles_revaha").select("id, role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") return { error: "המשתמש אינו אדמין" };
  const password = randomPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return { error: null, password };
}
