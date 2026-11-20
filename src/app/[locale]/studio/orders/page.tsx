import type { Metadata } from "next";
import { respondToRequestAction, updateOrderStatusAction } from "@/app/actions/marketplace";
import { Notice } from "@/components/dashboard/DashShell";
import { StatusPill } from "@/components/ui/StatusPill";
import { Submit } from "@/components/ui/form";
import { formatMoney } from "@/lib/format";
import { pageContext, pick } from "@/lib/i18n/page";
import { DashShell, studioContext, studioNav } from "@/lib/studio";

export const metadata: Metadata = { title: "Orders" };

const NEXT: Record<string, { status: string; label: string }[]> = {
  requested: [{ status: "confirmed", label: "Confirm order" }, { status: "cancelled", label: "Decline" }],
  confirmed: [{ status: "in_progress", label: "Start making" }, { status: "ready", label: "Mark ready" }, { status: "cancelled", label: "Cancel" }],
  in_progress: [{ status: "ready", label: "Mark ready" }, { status: "cancelled", label: "Cancel" }],
  ready: [{ status: "shipped", label: "Mark shipped" }, { status: "completed", label: "Mark handed over" }],
  shipped: [{ status: "completed", label: "Mark delivered" }],
  completed: [{ status: "refunded", label: "Record refund" }],
};

export default async function StudioOrders({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }) {
  const { locale } = await pageContext(params);
  const { error } = await searchParams;
  const { artist, db, badges } = await studioContext(locale);
  const [{ data: orders }, { data: requests }] = await Promise.all([
    db.from("marketplace_orders").select("*, order_items(title_snapshot, quantity, unit_price)").eq("artist_id", artist.id).order("created_at", { ascending: false }),
    db.from("project_requests").select("*").eq("artist_id", artist.id).order("created_at", { ascending: false }),
  ]);

  return (
    <DashShell title={pick(locale, { en: "My studio", fr: "Mon atelier", ar: "مرسمي" })} items={studioNav(locale, badges)} active={`/${locale}/studio/orders`}>
      {error && <Notice kind="error">{error}</Notice>}
      <h1 className="font-display text-3xl">Orders</h1>
      <p className="mt-1 text-sm text-muted">Payment happens directly between you and the customer. Record it here once received.</p>
      <ul className="mt-6 space-y-4">
        {(orders ?? []).length === 0 && <li className="text-muted">No orders yet.</li>}
        {(orders ?? []).map((o) => (
          <li key={o.id} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-xs text-muted">{o.reference} · {new Date(o.created_at).toLocaleDateString(locale)}</p>
              <div className="flex gap-2"><StatusPill status={o.status} /><StatusPill status={o.payment_status} /></div>
            </div>
            <ul className="mt-3 text-sm">
              {o.order_items.map((i: { title_snapshot: string; quantity: number; unit_price: number | null }) => (
                <li key={i.title_snapshot}>{i.quantity} × {i.title_snapshot} {i.unit_price != null ? `· ${formatMoney({ amount: Number(i.unit_price), currency: "TND" }, locale)}` : "· price to confirm"}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">{o.fulfilment.replace("_", " ")}{o.delivery_city ? ` · ${o.delivery_city}` : ""} · {o.payment_method.replaceAll("_", " ")}</p>
            {o.customer_note && <p className="mt-2 rounded-lg bg-cream px-3 py-2 text-sm">“{o.customer_note}”</p>}
            <form action={updateOrderStatusAction} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderId" value={o.id} />
              <input name="note" placeholder="Message to the customer (price, timing, pickup…)" defaultValue={o.artist_note ?? ""} className="min-w-60 flex-1 rounded-xl border border-line px-3 py-2 text-sm" />
              <select name="payment" defaultValue="" className="rounded-xl border border-line bg-white px-3 py-2 text-sm" aria-label="Payment">
                <option value="">Payment: {o.payment_status.replace("_", " ")}</option>
                <option value="paid_offline">Mark paid</option>
                <option value="unpaid">Mark unpaid</option>
                <option value="refunded_offline">Mark refunded</option>
              </select>
              {(NEXT[o.status] ?? []).map((n) => (
                <button key={n.status} name="status" value={n.status} className={`rounded-full px-4 py-2 text-sm ${n.status === "cancelled" ? "border border-line bg-white" : "bg-charcoal text-cream"}`}>{n.label}</button>
              ))}
              <button className="rounded-full border border-line bg-white px-4 py-2 text-sm">Save note</button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mt-14 font-display text-3xl">Custom requests</h2>
      <p className="mt-1 text-sm text-muted">Customers describe what they need. You decide what to create and how.</p>
      <ul className="mt-6 space-y-4">
        {(requests ?? []).length === 0 && <li className="text-muted">No requests yet.</li>}
        {(requests ?? []).map((r) => {
          const brief = r.brief as { what?: string; dimensions?: string; city?: string };
          return (
            <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
              <div className="flex items-center justify-between"><p className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString(locale)}</p><StatusPill status={r.status} /></div>
              <p className="mt-2">{brief.what}</p>
              <p className="mt-1 text-sm text-muted">
                {[brief.dimensions, brief.city, r.budget_amount ? `Budget ${r.budget_amount} TND` : null, r.deadline ? `By ${r.deadline}` : null].filter(Boolean).join(" · ")}
              </p>
              <form action={respondToRequestAction} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="requestId" value={r.id} />
                <input name="reply" placeholder="Your reply" defaultValue={r.artist_reply ?? ""} className="min-w-60 flex-1 rounded-xl border border-line px-3 py-2 text-sm" />
                {r.status === "submitted" || r.status === "in_discussion" ? (
                  <>
                    <button name="status" value="in_discussion" className="rounded-full border border-line bg-white px-4 py-2 text-sm">Reply</button>
                    <button name="status" value="accepted" className="rounded-full bg-charcoal px-4 py-2 text-sm text-cream">Accept</button>
                    <button name="status" value="declined" className="rounded-full border border-line bg-white px-4 py-2 text-sm">Decline</button>
                  </>
                ) : r.status === "accepted" ? (
                  <button name="status" value="in_progress" className="rounded-full bg-charcoal px-4 py-2 text-sm text-cream">Start</button>
                ) : r.status === "in_progress" ? (
                  <button name="status" value="completed" className="rounded-full bg-charcoal px-4 py-2 text-sm text-cream">Mark completed</button>
                ) : null}
              </form>
            </li>
          );
        })}
      </ul>
      <div className="hidden"><Submit>.</Submit></div>
    </DashShell>
  );
}
