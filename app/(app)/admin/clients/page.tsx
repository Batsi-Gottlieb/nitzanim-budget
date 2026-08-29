import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateClientForm } from "./CreateClientForm";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("*").order("name");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <p className="mt-1 text-sm text-foreground-muted">ניהול לקוחות ויצירת משתמשים מקושרים.</p>
      </div>

      <CreateClientForm />

      <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {(clients ?? []).map((c) => (
          <Link key={c.id} href={`/admin/clients/${c.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-muted">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-foreground-muted">{c.contact_email}</div>
            </div>
            <span className="text-foreground-muted">ניהול מודלים ←</span>
          </Link>
        ))}
        {(clients ?? []).length === 0 && <div className="px-4 py-3 text-sm text-foreground-muted">אין לקוחות עדיין</div>}
      </div>
    </div>
  );
}
