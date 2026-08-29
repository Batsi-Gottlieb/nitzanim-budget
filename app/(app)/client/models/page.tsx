import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSubModel } from "./actions";

export default async function ClientModelsPage() {
  const session = await getCurrentProfile();
  const clientId = session?.profile?.client_id;
  if (!clientId) return <p className="text-foreground-muted">חשבון זה אינו משויך ללקוח.</p>;

  const supabase = await createClient();
  const { data: activeYear } = await supabase.from("years").select("*").eq("is_active", true).maybeSingle();
  if (!activeYear) return <p className="text-foreground-muted">אין שנת פעילות פעילה.</p>;

  const { data: clientYear } = await supabase
    .from("client_years")
    .select("*")
    .eq("client_id", clientId)
    .eq("year_id", activeYear.id)
    .maybeSingle();

  const { data: clientModels } = clientYear
    ? await supabase
        .from("client_models")
        .select("*, models(*)")
        .eq("client_year_id", clientYear.id)
    : { data: [] };

  const clientModelIds = (clientModels ?? []).map((cm) => cm.id);
  const { data: subModels } = clientModelIds.length
    ? await supabase.from("sub_models").select("*").in("client_model_id", clientModelIds)
    : { data: [] };

  const subModelsByClientModel = new Map<string, typeof subModels>();
  for (const sm of subModels ?? []) {
    const list = subModelsByClientModel.get(sm.client_model_id) ?? [];
    list.push(sm);
    subModelsByClientModel.set(sm.client_model_id, list);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">המודלים שלי — {activeYear.hebrew_name}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          עבור כל מודל ניתן לפתוח מודלי-משנה בשם חופשי ולהתאים את נתוני הבסיס לתוכנית העבודה שלך.
        </p>
      </div>

      {(["גנים", "בתי_ספר"] as const).map((cat) => {
        const inCat = (clientModels ?? []).filter((cm) => (cm.models as unknown as { category: string }).category === cat);
        if (inCat.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className="mb-3 text-lg font-semibold">{cat === "גנים" ? "צהרוני גנים" : "צהרוני בתי ספר"}</h2>
            <div className="space-y-4">
              {inCat.map((cm) => {
                const model = cm.models as unknown as { id: string; name: string; code: string };
                const subs = subModelsByClientModel.get(cm.id) ?? [];
                return (
                  <div key={cm.id} className="rounded-2xl border border-border bg-surface p-4">
                    <h3 className="font-semibold">{model.name}</h3>
                    <div className="mt-2 space-y-1">
                      {subs.map((sm) => (
                        <Link
                          key={sm!.id}
                          href={`/client/models/sub/${sm!.id}`}
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-muted"
                        >
                          מודל משנה: <span className="font-medium">{sm!.name}</span>
                        </Link>
                      ))}
                    </div>
                    <form action={createSubModel} className="mt-3 flex items-end gap-2">
                      <input type="hidden" name="client_model_id" value={cm.id} />
                      <input type="hidden" name="client_id" value={clientId} />
                      <input
                        name="name"
                        required
                        placeholder="שם מודל משנה, למשל: חרדי"
                        className="w-56 rounded-md border border-border px-2 py-1.5 text-sm"
                      />
                      <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">
                        פתיחת מודל משנה
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {(clientModels ?? []).length === 0 && (
        <p className="text-sm text-foreground-muted">טרם שויכו לך מודלים לשנה זו. פנה/י למנהל המערכת.</p>
      )}
    </div>
  );
}
