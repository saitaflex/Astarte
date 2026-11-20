import type { Metadata } from "next";
import Link from "next/link";
import { updateOrderStatusAction } from "@/app/actions/marketplace";
import { StatusPill } from "@/components/ui/StatusPill";
import { Submit } from "@/components/ui/form";
import { requireRole } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";
import { pageContext, pick } from "@/lib/i18n/page";
import { one } from "@/lib/supabase/rel";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ordered?: string; requested?: string; error?: string }> }) {
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const user = await requireRole(locale, ["customer"]);
  const db = await supabaseServer();

  const [orders, favs, requests, balance] = await Promise.all([
    db.from("marketplace_orders").select("*, order_items(title_snapshot, quantity, unit_price), artist_profiles(display_name, slug)").order("created_at", { ascending: false }).limit(30),
    db.from("favorites").select("id, product_id, artist_id, products(title, id), artist_profiles(display_name, slug)").eq("customer_id", user.id),
    db.from("project_requests").select("id, status, brief, artist_reply, created_at, artist_profiles(display_name, slug)").order("created_at", { ascending: false }),
    db.rpc("my_point_balance"),
  ]);

  const L = {
    hello: pick(locale, { en: "Hello", fr: "Bonjour", ar: "مرحبًا" }),
    orders: pick(locale, { en: "Your orders", fr: "Vos commandes", ar: "طلباتك" }),
    noOrders: pick(locale, { en: "No orders yet.", fr: "Aucune commande pour l'instant.", ar: "لا توجد طلبات بعد." }),
    cancel: pick(locale, { en: "Cancel request", fr: "Annuler la demande", ar: "إلغاء الطلب" }),
    saved: pick(locale, { en: "Saved", fr: "Enregistrés", ar: "المحفوظات" }),
    requests: pick(locale, { en: "Custom requests", fr: "Demandes sur mesure", ar: "الطلبات الخاصة" }),
    reply: pick(locale, { en: "Artist reply", fr: "Réponse de l'artiste", ar: "رد الفنان" }),
    points: pick(locale, { en: "Point Merci balance", fr: "Solde Point Merci", ar: "رصيد نقاط ميرسي" }),
    ordered: pick(locale, { en: "Order request sent. The artist will confirm it with you.", fr: "Demande envoyée. L'artiste la confirmera avec vous.", ar: "أُرسل الطلب. سيؤكده الفنان معك." }),
    requested: pick(locale, { en: "Request sent to the artist.", fr: "Demande envoyée à l'artiste.", ar: "أُرسل الطلب إلى الفنان." }),
    payment: pick(locale, { en: "Payment", fr: "Paiement", ar: "الدفع" }),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <h1 className="font-display text-4xl">{L.hello}, {user.displayName || user.email}</h1>
      {(sp.ordered || sp.requested) && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{sp.ordered ? L.ordered : L.requested}</p>}
      {sp.error && <p role="alert" className="mt-4 rounded-xl bg-orange/10 px-4 py-3 text-sm">{sp.error}</p>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="orders">
          <h2 id="orders" className="font-display text-2xl">{L.orders}</h2>
          {(orders.data ?? []).length === 0 ? (
            <p className="mt-4 text-muted">{L.noOrders} <Link href={`/${locale}/marketplace`} className="underline decoration-orange underline-offset-4">Marketplace →</Link></p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(orders.data ?? []).map((o) => (
                <li key={o.id} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-muted">{o.reference}</p>
                      <Link href={`/${locale}/artists/${one(o.artist_profiles)?.slug}`} className="font-display text-lg hover:text-orange-ink">{one(o.artist_profiles)?.display_name}</Link>
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                  <ul className="mt-3 text-sm text-charcoal/85">
                    {o.order_items.map((i: { title_snapshot: string; quantity: number }) => <li key={i.title_snapshot}>{i.quantity} × {i.title_snapshot}</li>)}
                  </ul>
                  <p className="mt-2 text-sm text-muted">
                    {Number(o.subtotal) > 0 ? formatMoney({ amount: Number(o.subtotal), currency: "TND" }, locale) : "—"} · {o.fulfilment.replace("_", " ")} · {L.payment}: {o.payment_status.replace("_", " ")}
                  </p>
                  {o.artist_note && <p className="mt-2 rounded-lg bg-cream px-3 py-2 text-sm">{o.artist_note}</p>}
                  {o.status === "requested" && (
                    <form action={updateOrderStatusAction} className="mt-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="orderId" value={o.id} />
                      <input type="hidden" name="status" value="cancelled" />
                      <Submit variant="ghost" className="!py-2 text-sm">{L.cancel}</Submit>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-12 font-display text-2xl">{L.requests}</h2>
          <ul className="mt-4 space-y-3">
            {(requests.data ?? []).map((r) => (
              <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/${locale}/artists/${one(r.artist_profiles)?.slug}`} className="font-display text-lg">{one(r.artist_profiles)?.display_name}</Link>
                  <StatusPill status={r.status} />
                </div>
                <p className="mt-2 text-sm text-charcoal/85">{(r.brief as { what?: string })?.what}</p>
                {r.artist_reply && <p className="mt-2 rounded-lg bg-cream px-3 py-2 text-sm"><span className="text-muted">{L.reply}: </span>{r.artist_reply}</p>}
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <Link href={`/${locale}/points`} className="block rounded-[22px] bg-charcoal p-6 text-cream">
            <p className="text-xs uppercase tracking-[0.16em] text-orange-soft">{L.points}</p>
            <p className="mt-2 font-display text-5xl">{(balance.data as number) ?? 0}</p>
            <p className="mt-3 text-sm text-cream/70">Point Merci →</p>
          </Link>
          <section className="rounded-[22px] border border-line bg-white/70 p-6">
            <h2 className="font-display text-xl">{L.saved}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(favs.data ?? []).map((f) => (
                <li key={f.id}>
                  {one(f.products) ? (
                    <Link href={`/${locale}/marketplace/${one(f.products)?.id}`} className="hover:text-orange-ink">♥ {one(f.products)?.title}</Link>
                  ) : (
                    <Link href={`/${locale}/artists/${one(f.artist_profiles)?.slug}`} className="hover:text-orange-ink">♥ {one(f.artist_profiles)?.display_name}</Link>
                  )}
                </li>
              ))}
              {(favs.data ?? []).length === 0 && <li className="text-muted">—</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
