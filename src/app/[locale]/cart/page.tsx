import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { placeOrderAction, updateCartAction } from "@/app/actions/marketplace";
import { ProductArt } from "@/components/market/ProductArt";
import { Submit } from "@/components/ui/form";
import { getSessionUser } from "@/lib/auth/session";
import { getCatalog } from "@/lib/data/repository";
import { formatMoney } from "@/lib/format";
import { marketLabels } from "@/lib/i18n/market-labels";
import { pageContext } from "@/lib/i18n/page";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }) {
  const { locale, t } = await pageContext(params);
  const { error } = await searchParams;
  const m = marketLabels(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/cart`);
  if (user.role !== "customer") redirect(`/${locale}/marketplace`);

  const db = await supabaseServer();
  const { data: rows } = await db.from("shopping_cart_items").select("product_id, quantity").eq("customer_id", user.id).order("added_at");
  const { products, artists } = await getCatalog();
  const items = (rows ?? [])
    .map((r) => ({ ...r, product: products.find((p) => p.id === r.product_id) }))
    .filter((r): r is typeof r & { product: NonNullable<typeof r.product> } => Boolean(r.product));
  const artistName = (id: string) => artists.find((a) => a.id === id)?.displayName ?? "";

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">{m.cart}</h1>
        <p className="mt-3 text-muted">{m.empty}</p>
        <Link href={`/${locale}/marketplace`} className="mt-8 inline-block rounded-full bg-orange px-6 py-3 font-medium">{m.browse}</Link>
      </div>
    );
  }

  // Only offer fulfilment options every item supports.
  const all = ["pickup", "local_delivery", "shipping"] as const;
  const options = all.filter((o) => items.every((i) => i.product.deliveryOptions?.includes(o)));
  const priced = items.filter((i) => i.product.price);
  const subtotal = priced.reduce((s, i) => s + i.product.price!.amount * i.quantity, 0);
  const artistsInCart = new Set(items.map((i) => i.product.artistId)).size;

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-8 sm:px-6 lg:grid-cols-[1fr_380px]">
      <section>
        <h1 className="font-display text-4xl">{m.cart}</h1>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {items.map((i) => (
            <li key={i.product_id} className="grid grid-cols-[88px_1fr_auto] items-center gap-4 py-5">
              <div className="group relative aspect-square overflow-hidden rounded-xl">
                <ProductArt images={i.product.images} category={i.product.categories[0] ?? ""} alt={i.product.title} sizes="88px" />
              </div>
              <div className="min-w-0">
                <Link href={`/${locale}/marketplace/${i.product.id}`} className="font-display text-lg hover:text-orange-ink">{i.product.title}</Link>
                <p className="text-sm text-muted">{m.by} {artistName(i.product.artistId)}</p>
                <p className="text-sm">{i.product.price ? formatMoney(i.product.price, locale) : m.priceTbc}</p>
              </div>
              <form action={updateCartAction} className="flex items-center gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="productId" value={i.product_id} />
                <label className="sr-only" htmlFor={`q-${i.product_id}`}>{m.quantity}</label>
                <select id={`q-${i.product_id}`} name="quantity" defaultValue={i.quantity} className="rounded-lg border border-line bg-white px-2 py-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n === 0 ? m.remove : n}</option>)}
                </select>
                <button className="text-sm text-muted underline">OK</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <aside className="lg:pt-16">
        <form action={placeOrderAction} className="space-y-5 rounded-[22px] border border-line bg-white/80 p-6">
          <input type="hidden" name="locale" value={locale} />
          {error && <p role="alert" className="rounded-xl bg-orange/10 px-4 py-3 text-sm">{error}</p>}
          <div className="flex justify-between text-sm"><span className="text-muted">{m.subtotal}</span><span className="font-medium">{formatMoney({ amount: subtotal, currency: "TND" }, locale)}</span></div>
          {priced.length < items.length && <p className="text-xs text-muted">+ {m.priceTbc}</p>}

          <fieldset>
            <legend className="text-sm font-medium">{m.howReceive}</legend>
            {options.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t.results.error}</p>
            ) : (
              <div className="mt-2 space-y-2">
                {options.map((o, idx) => (
                  <label key={o} className="flex items-center gap-3 text-sm">
                    <input type="radio" name="fulfilment" value={o} defaultChecked={idx === 0} className="accent-[#F28C28]" /> {m[o]}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <label className="block text-sm">
            <span className="font-medium">{m.yourCity}</span>
            <input name="city" maxLength={80} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5" />
          </label>
          <fieldset>
            <legend className="text-sm font-medium">{m.payment}</legend>
            <div className="mt-2 space-y-2">
              {(["pay_artist_directly", "cash_on_delivery", "bank_transfer"] as const).map((p, idx) => (
                <label key={p} className="flex items-center gap-3 text-sm">
                  <input type="radio" name="payment" value={p} defaultChecked={idx === 0} className="accent-[#F28C28]" /> {m[p]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            <span className="font-medium">{m.note}</span>
            <textarea name="note" rows={3} maxLength={1000} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5" />
          </label>
          <p className="text-xs leading-relaxed text-muted">{m.noPayment}{artistsInCart > 1 ? ` ${m.splitNote}` : ""}</p>
          <Submit className="w-full">{m.sendOrder}</Submit>
        </form>
      </aside>
    </div>
  );
}
