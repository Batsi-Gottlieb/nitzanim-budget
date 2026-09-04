const PALETTE = [
  "bg-slate-900",
  "bg-amber-500",
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
];

export function roleTypeDotColor(roleTypeId: string, allRoleTypeIds: string[]): string {
  const index = allRoleTypeIds.indexOf(roleTypeId);
  return PALETTE[index >= 0 ? index % PALETTE.length : 0];
}
