export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="ניצנים" width={size} height={size} style={{ objectFit: "contain" }} />
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
