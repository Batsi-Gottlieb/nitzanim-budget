import { createClient } from "@/lib/supabase/server";
import { CreateClientForm } from "./CreateClientForm";
import { ClientRow } from "./ClientRow";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("*").order("name");

  const clientIds = (clients ?? []).map((c) => c.id);
  const { data: allUsers } = clientIds.length
    ? await supabase.from("profiles").select("id, email, full_name, client_id").in("client_id", clientIds).order("created_at")
    : { data: [] };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <p className="mt-1 text-sm text-foreground-muted">ניהול לקוחות ויצירת משתמשים מקושרים.</p>
      </div>

      <CreateClientForm />

      <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {(clients ?? []).map((c) => (
          <ClientRow key={c.id} client={c} users={(allUsers ?? []).filter((u) => u.client_id === c.id)} />
        ))}
        {(clients ?? []).length === 0 && <div className="px-4 py-3 text-sm text-foreground-muted">אין לקוחות עדיין</div>}
      </div>
    </div>
  );
}
