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

/** Same order as PALETTE, as hex values (no leading #) for use outside the browser, e.g. in generated Excel files. */
const HEX_PALETTE = ["0f172a", "f59e0b", "8b5cf6", "3b82f6", "10b981", "f43f5e", "06b6d4", "d946ef"];

export function roleTypeDotColor(roleTypeId: string, allRoleTypeIds: string[]): string {
  const index = allRoleTypeIds.indexOf(roleTypeId);
  return PALETTE[index >= 0 ? index % PALETTE.length : 0];
}

export function roleTypeHexColor(roleTypeId: string, allRoleTypeIds: string[]): string {
  const index = allRoleTypeIds.indexOf(roleTypeId);
  return HEX_PALETTE[index >= 0 ? index % HEX_PALETTE.length : 0];
}
