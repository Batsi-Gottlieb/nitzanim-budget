import { createClient } from "@/lib/supabase/server";
import { createYear, setActiveYear } from "./actions";

export default async function YearsPage() {
  const supabase = await createClient();
  const { data: years } = await supabase.from("years").select("*").order("start_date", { ascending: false });

  async function activate(formData: FormData) {
    "use server";
    await setActiveYear(formData.get("year_id") as string);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">שנות פעילות</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          כל שנת פעילות עברית היא &quot;מחיצה&quot; נפרדת עם נתוני הבסיס שלה. ניתן לפתוח שנה חדשה ולשכפל אליה את
          נתוני הבסיס של שנה קודמת כנקודת התחלה.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">פתיחת שנת פעילות חדשה</h2>
        <form action={createYear} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">שם השנה (עברי)</label>
            <input name="hebrew_name" required placeholder='תשפ"ז' className="w-full rounded-md border border-border px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">תאריך התחלה</label>
            <input name="start_date" type="date" required className="w-full rounded-md border border-border px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">תאריך סיום</label>
            <input name="end_date" type="date" required className="w-full rounded-md border border-border px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">שכפול נתוני בסיס משנה</label>
            <select name="clone_from_year_id" className="w-full rounded-md border border-border px-2 py-1.5 text-sm">
              <option value="">ללא שכפול</option>
              {(years ?? []).map((y) => (
                <option key={y.id} value={y.id}>
                  {y.hebrew_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
              פתיחת שנה
            </button>
          </div>
        </form>
      </section>

      <section className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {(years ?? []).map((y) => (
          <div key={y.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <span className="font-medium">{y.hebrew_name}</span>{" "}
              <span className="text-foreground-muted">
                ({y.start_date} – {y.end_date})
              </span>
            </div>
            {y.is_active ? (
              <span className="text-xs font-semibold text-success">שנה פעילה ✓</span>
            ) : (
              <form action={activate}>
                <input type="hidden" name="year_id" value={y.id} />
                <button className="text-xs font-semibold text-primary hover:underline">הפוך לשנה פעילה</button>
              </form>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
