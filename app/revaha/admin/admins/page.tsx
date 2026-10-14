import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRevahaProfile } from "@/lib/revaha/auth";
import { AdminsSection } from "./AdminsSection";

export default async function RevahaAdminsPage() {
  const session = await getCurrentRevahaProfile();
  if (session?.profile?.role !== "admin") redirect("/revaha");

  const supabase = await createClient();
  const { data: admins } = await supabase
    .from("profiles_revaha")
    .select("id, email, full_name")
    .eq("role", "admin")
    .order("created_at");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          מנהלי מערכת
        </h1>
        <p className="mt-1 text-sm text-slate-500">הוספת אדמינים נוספים עם גישה מלאה למערכת הרווחה.</p>
      </div>
      <AdminsSection initialAdmins={admins ?? []} currentUserId={session.userId} />
    </div>
  );
}
