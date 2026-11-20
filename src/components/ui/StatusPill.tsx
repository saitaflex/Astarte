const tone: Record<string, string> = {
  requested: "bg-orange/15 text-orange-ink",
  submitted: "bg-orange/15 text-orange-ink",
  pending: "bg-orange/15 text-orange-ink",
  pending_review: "bg-orange/15 text-orange-ink",
  in_discussion: "bg-cream-deep",
  confirmed: "bg-charcoal text-cream",
  accepted: "bg-charcoal text-cream",
  approved: "bg-charcoal text-cream",
  active: "bg-charcoal text-cream",
  in_progress: "bg-cream-deep",
  ready: "bg-cream-deep",
  shipped: "bg-cream-deep",
  completed: "bg-emerald-100 text-emerald-900",
  issued: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-zinc-200 text-zinc-700",
  declined: "bg-zinc-200 text-zinc-700",
  rejected: "bg-zinc-200 text-zinc-700",
  refunded: "bg-zinc-200 text-zinc-700",
  changes_requested: "bg-amber-100 text-amber-900",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tone[status] ?? "bg-cream-deep"}`}>{status.replaceAll("_", " ")}</span>;
}
