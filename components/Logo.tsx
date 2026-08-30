export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGold" x1="4" y1="8" x2="34" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EAC97F" />
          <stop offset="0.55" stopColor="#C69B4A" />
          <stop offset="1" stopColor="#8F6A2A" />
        </linearGradient>
        <linearGradient id="logoDark" x1="14" y1="6" x2="44" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3A3D43" />
          <stop offset="1" stopColor="#1C1E22" />
        </linearGradient>
      </defs>
      <rect x="14" y="4" width="26" height="26" rx="4" transform="rotate(45 27 17)" fill="url(#logoDark)" />
      <rect x="4" y="14" width="26" height="26" rx="4" transform="rotate(45 17 27)" fill="url(#logoGold)" />
      <rect x="10" y="20" width="14" height="4.5" rx="2.25" transform="rotate(45 17 22.25)" fill="#1C1E22" fillOpacity="0.18" />
    </svg>
  );
}

export function LogoLockup({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="leading-tight">
        <div className="text-xl font-extrabold gold-text">ניצנים</div>
        <div className="text-[11px] tracking-wide text-sidebar-foreground-muted">רוח גוטליב-ביטון</div>
      </div>
    </div>
  );
}
