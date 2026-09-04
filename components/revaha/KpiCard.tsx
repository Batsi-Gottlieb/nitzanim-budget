import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent = "indigo",
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: "indigo" | "emerald";
}) {
  const iconColor = accent === "emerald" ? "text-emerald-600" : "text-indigo-600";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <span className="block text-[10px] font-bold uppercase text-slate-400">{label}</span>
      <div className="mt-0.5 flex items-center gap-1.5 text-xl font-bold text-slate-900">
        {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
        <span>{value}</span>
      </div>
      {subtitle && <span className="text-[10px] text-slate-500">{subtitle}</span>}
    </div>
  );
}
