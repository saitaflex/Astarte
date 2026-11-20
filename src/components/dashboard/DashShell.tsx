import Link from "next/link";

/** Shared frame for the artist studio and the admin area: simple side navigation, content first. */
export function DashShell({ title, items, active, children, banner }: { title: string; items: { href: string; label: string; badge?: number }[]; active: string; children: React.ReactNode; banner?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-ink">{title}</p>
      {banner}
      <div className="mt-6 grid gap-8 md:grid-cols-[200px_1fr]">
        <nav aria-label={title} className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
          {items.map((i) => {
            const on = active === i.href;
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${on ? "bg-charcoal text-cream" : "text-charcoal/80 hover:bg-white"}`}
              >
                {i.label}
                {i.badge ? <span className={`rounded-full px-2 text-xs ${on ? "bg-orange text-charcoal" : "bg-orange/20 text-orange-ink"}`}>{i.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Notice({ kind = "ok", children }: { kind?: "ok" | "error" | "info"; children: React.ReactNode }) {
  const style = kind === "ok" ? "bg-emerald-50 text-emerald-900" : kind === "error" ? "bg-orange/10 text-charcoal" : "bg-white border border-line text-charcoal";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`mb-6 rounded-xl px-4 py-3 text-sm ${style}`}>
      {children}
    </p>
  );
}
