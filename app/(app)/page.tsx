import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getCurrentProfile();
  const supabase = await createClient();
  const { data: activeYear } = await supabase.from("years").select("*").eq("is_active", true).maybeSingle();

  const isAdmin = session?.profile?.role === "admin";

  let stats: { label: string; value: number }[] = [];
  if (isAdmin) {
    const [{ count: clientsCount }, { count: modelsCount }] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase.from("models").select("*", { count: "exact", head: true }),
    ]);
    stats = [
      { label: "לקוחות", value: clientsCount ?? 0 },
      { label: "מודלים בקטלוג", value: modelsCount ?? 0 },
    ];
  } else if (session?.profile?.client_id) {
    const { count: subModelsCount } = await supabase
      .from("sub_models")
      .select("*", { count: "exact", head: true })
      .eq("client_id", session.profile.client_id);
    stats = [{ label: "מודלי משנה פעילים", value: subModelsCount ?? 0 }];
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">
        שלום{session?.profile?.full_name ? `, ${session.profile.full_name}` : ""} 👋
      </h1>
      <p className="mt-1 text-foreground-muted">
        שנת פעילות נוכחית: <span className="font-semibold text-primary">{activeYear?.hebrew_name ?? "לא הוגדרה"}</span>
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-5">
            <div className="text-3xl font-extrabold text-primary">{s.value}</div>
            <div className="mt-1 text-sm text-foreground-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
