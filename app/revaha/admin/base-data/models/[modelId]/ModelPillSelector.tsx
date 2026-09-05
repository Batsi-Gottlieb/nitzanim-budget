import Link from "next/link";

type ModelPill = { id: string; name: string; totalHours: number };

export function ModelPillSelector({ models, activeModelId }: { models: ModelPill[]; activeModelId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {models.map((m) => {
        const active = m.id === activeModelId;
        return (
          <Link
            key={m.id}
            href={`/revaha/admin/base-data/models/${m.id}`}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              active ? "bg-indigo-600 text-white shadow-xs" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{m.name}</span>
            {m.totalHours > 0 && (
              <span className="text-[10px] font-normal opacity-80">({Math.round(m.totalHours).toLocaleString("he-IL")} ש&apos;)</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
