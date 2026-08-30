"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("אימייל או סיסמה שגויים");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar-bg px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #C69B4A 0, transparent 45%), radial-gradient(circle at 85% 75%, #C69B4A 0, transparent 40%)",
        }}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-sidebar-border bg-surface p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={56} />
          <h1 className="mt-4 text-2xl font-extrabold gold-text">ניצנים</h1>
          <p className="mt-1 text-sm text-foreground-muted">מערכת תקציבי צהרונים · רוח גוטליב-ביטון</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">אימייל</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">סיסמה</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-bold shadow-md transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--gold-gradient)", color: "#211d14" }}
          >
            {loading ? "מתחבר..." : "כניסה"}
          </button>
        </form>
      </div>
    </main>
  );
}
