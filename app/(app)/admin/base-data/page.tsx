import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GeneralDataForm } from "./GeneralDataForm";
import { createModel } from "./actions";

export default async function BaseDataPage() {
  const supabase = await createClient();
  const { data: activeYear } = await supabase.from("years").select("*").eq("is_active", true).maybeSingle();
  const { data: generalData } = activeYear
    ? await supabase.from("year_general_data").select("*").eq("year_id", activeYear.id)
    : { data: [] };
  const { data: models } = await supabase.from("models").select("*").order("category").order("name");

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">בסיס מידע — {activeYear?.hebrew_name ?? "אין שנה פעילה"}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          נתונים כלליים וקטלוג מודלים לשנת הפעילות. משמשים כברירת מחדל לכלל הלקוחות.
        </p>
      </div>

      {activeYear && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">נתונים כלליים שנתיים</h2>
          <GeneralDataForm yearId={activeYear.id} initial={generalData ?? []} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">קטלוג מודלים</h2>
        <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <form action={createModel} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">קוד</label>
              <input name="code" required className="w-28 rounded-md border border-border px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">שם המודל</label>
              <input name="name" required className="w-56 rounded-md border border-border px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">קטגוריה</label>
              <select name="category" className="rounded-md border border-border px-2 py-1.5 text-sm">
                <option value="גנים">צהרוני גנים</option>
                <option value="בתי_ספר">צהרוני בתי ספר</option>
              </select>
            </div>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
              הוספת מודל
            </button>
          </form>
        </div>

        {(["גנים", "בתי_ספר"] as const).map((cat) => (
          <div key={cat} className="mb-6">
            <h3 className="mb-2 text-sm font-bold text-foreground-muted">
              {cat === "גנים" ? "צהרוני גנים" : "צהרוני בתי ספר"}
            </h3>
            <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {(models ?? []).filter((m) => m.category === cat).map((m) => (
                <Link
                  key={m.id}
                  href={`/admin/base-data/models/${m.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-muted"
                >
                  <span className="font-medium">
                    {m.name} <span className="text-foreground-muted">({m.code})</span>
                  </span>
                  <span className="text-foreground-muted">עריכת נתוני בסיס ←</span>
                </Link>
              ))}
              {(models ?? []).filter((m) => m.category === cat).length === 0 && (
                <div className="px-4 py-3 text-sm text-foreground-muted">אין מודלים בקטגוריה זו</div>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
