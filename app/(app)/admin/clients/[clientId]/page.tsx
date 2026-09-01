import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assignModelToClient, setClientLamasLevel } from "../actions";

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (!client) notFound();

  const { data: activeYear } = await supabase.from("years").select("*").eq("is_active", true).maybeSingle();
  if (!activeYear) return <p className="text-foreground-muted">אין שנת פעילות פעילה.</p>;

  const { data: clientYear } = await supabase
    .from("client_years")
    .select("*")
    .eq("client_id", clientId)
    .eq("year_id", activeYear.id)
    .maybeSingle();

  const { data: allModels } = await supabase.from("models").select("*").order("category").order("name");
  const { data: assigned } = clientYear
    ? await supabase.from("client_models").select("model_id").eq("client_year_id", clientYear.id)
    : { data: [] };
  const assignedIds = new Set((assigned ?? []).map((a) => a.model_id));

  const assign = assignModelToClient.bind(null, clientId, activeYear.id);
  const saveLamas = setClientLamasLevel.bind(null, clientId, activeYear.id);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{client.contact_email}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/clients/${clientId}/export?tier=basic`}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-muted"
          >
            ייצוא (בסיס בלבד)
          </a>
          <a
            href={`/api/clients/${clientId}/export?tier=all`}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-muted"
          >
            ייצוא (כולל מורחב)
          </a>
        </div>
      </div>

      <p className="text-xs text-foreground-muted">
        עריכת פרטי הלקוח והמשתמשים המקושרים אליו זמינה דרך כפתור העריכה (✏️) ברשימת הלקוחות.
      </p>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">דרג למ&quot;ס — שנת {activeYear.hebrew_name}</h2>
        <form action={saveLamas} className="flex items-end gap-3">
          <select
            key={clientYear?.lamas_level ?? "unset"}
            name="lamas_level"
            defaultValue={clientYear?.lamas_level ?? ""}
            className="rounded-md border border-border px-2 py-1.5 text-sm"
          >
            <option value="" disabled>
              בחר דרג
            </option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
            שמירה
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">מודלים משויכים — שנת {activeYear.hebrew_name}</h2>
        {(["גנים", "בתי_ספר"] as const).map((cat) => (
          <div key={cat} className="mb-4">
            <h3 className="mb-2 text-sm font-bold text-foreground-muted">
              {cat === "גנים" ? "צהרוני גנים" : "צהרוני בתי ספר"}
            </h3>
            <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {(allModels ?? []).filter((m) => m.category === cat).map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>{m.name}</span>
                  {assignedIds.has(m.id) ? (
                    <span className="text-xs font-semibold text-success">משויך ✓</span>
                  ) : (
                    <form action={assign}>
                      <input type="hidden" name="model_id" value={m.id} />
                      <button className="text-xs font-semibold text-primary hover:underline">שיוך מודל</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
