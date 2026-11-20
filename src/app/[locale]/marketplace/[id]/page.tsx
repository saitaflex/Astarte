import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addToCartAction, toggleFavoriteAction } from "@/app/actions/marketplace";
import { ProductArt } from "@/components/market/ProductArt";
import { RecoStrip } from "@/components/recommend/RecoStrip";
import { TrackLink, TrackView } from "@/components/recommend/Track";
import { similarProducts } from "@/lib/recommend";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Submit } from "@/components/ui/form";
import { getSessionUser } from "@/lib/auth/session";
import { categoryName } from "@/lib/data/categories";
import { getCatalog } from "@/lib/data/repository";
import { formatMoney } from "@/lib/format";
import { marketLabels } from "@/lib/i18n/market-labels";
import { pageContext } from "@/lib/i18n/page";
import { supabaseServer } from "@/lib/supabase/server";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { products } = await getCatalog();
  const p = products.find((x) => x.id === id);
  if (!p) return { title: "Work" };
  const img = p.images?.[0];
  const description = `${p.price ? `${p.price.amount} ${p.price.currency} · ` : ""}${p.description}`.slice(0, 160);
  return {
    title: p.title,
    description,
    openGraph: { title: `${p.title} · Astarte`, description, images: img ? [{ url: img, alt: p.title }] : undefined },
    twitter: { card: img ? "summary_large_image" : "summary", title: p.title, description, images: img ? [img] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { locale, t } = await pageContext(params);
  const { error } = await searchParams;
  const m = marketLabels(locale);
  const { products, artists } = await getCatalog();
  const p = products.find((x) => x.id === id);
  if (!p) notFound();
  const artist = artists.find((a) => a.id === p.artistId);
  if (!artist) notFound();

  const user = await getSessionUser();
  let saved = false;
  if (user?.role === "customer") {
    const db = await supabaseServer();
    const { data } = await db.from("favorites").select("id").eq("customer_id", user.id).eq("product_id", p.id).maybeSingle();
    saved = Boolean(data);
  }
  const canBuy = p.availability !== "unavailable" && (p.stock == null || p.stock > 0);
  const more = products.filter((x) => x.artistId === artist.id && x.id !== p.id).slice(0, 3);
  const similar = (await similarProducts(p.id, 4)).filter((s) => s.artist.id !== artist.id || more.length === 0);
  const recoTitle = locale === "fr" ? "Vous aimerez aussi" : locale === "ar" ? "قد يعجبك أيضًا" : "You may also like";
  const recoNote = locale === "fr" ? "Suggestions par machine learning : contenu, visites et diversité" : locale === "ar" ? "اقتراحات بالتعلم الآلي: المحتوى والزيارات والتنوع" : "Machine-learning suggestions: content, visits and diversity";
  const back = `/${locale}/marketplace/${p.id}`;

  return (
    <article className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <TrackView kind="view_product" productId={p.id} artistId={artist.id} />
      <Link href={`/${locale}/marketplace`} className="text-sm text-muted hover:text-charcoal">← {m.title}</Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-3">
          <div className="group relative aspect-[4/5] overflow-hidden rounded-[22px]">
            <ProductArt images={p.images} category={p.categories[0] ?? ""} alt={p.title} sizes="(max-width: 1024px) 100vw, 60vw" priority />
          </div>
          {(p.images?.length ?? 0) > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {p.images!.slice(1, 5).map((src) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded-xl">
                  <Image src={src} alt="" fill sizes="15vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-ink">{p.categories.map((c) => categoryName(c, locale)).join(" · ")}</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.05]">{p.title}</h1>
          <Link href={`/${locale}/artists/${artist.slug}`} className="mt-2 inline-block text-muted hover:text-charcoal">
            {m.by} <span className="text-charcoal underline decoration-orange/60 underline-offset-4">{artist.displayName}</span>
            {artist.location && artist.location.privacy !== "hidden" ? ` · ${artist.location.city}` : ""}
          </Link>

          <p className="mt-6 text-2xl font-medium">{p.price ? formatMoney(p.price, locale) : t.results.priceOnRequest}</p>
          <p className="mt-1 text-sm text-muted">
            {p.availability === "in_stock" ? t.results.inStock : p.availability === "made_to_order" ? t.results.madeToOrder : t.results.unavailable}
            {p.stock != null && p.availability === "in_stock" ? ` · ${m.stockLeft.replace("{n}", String(p.stock))}` : ""}
          </p>

          {error && <p role="alert" className="mt-4 rounded-xl bg-orange/10 px-4 py-3 text-sm">{error === "customers_only" ? m.customersOnly : t.results.error}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            {canBuy && (
              <form action={addToCartAction} className="flex-1">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="productId" value={p.id} />
                <Submit className="w-full">{user ? m.addToCart : m.signInToBuy}</Submit>
              </form>
            )}
            <form action={toggleFavoriteAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="productId" value={p.id} />
              <input type="hidden" name="back" value={back} />
              <Submit variant="ghost">{saved ? `♥ ${m.saved}` : `♡ ${m.favorite}`}</Submit>
            </form>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">{m.noPayment}</p>
          <div className="mt-4"><ShareButtons title={p.title} text={`${p.title} by ${artist.displayName} on Astarte`} /></div>
          <Link href={`/${locale}/passport/${p.id}`} className="mt-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-orange/40 bg-orange/5 px-4 py-3 text-sm transition hover:bg-orange/10">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange text-charcoal" aria-hidden="true">♻</span>
            <span><strong className="font-medium">{locale === "fr" ? "Passeport Savoir-faire" : locale === "ar" ? "جواز الحِرفة" : "Savoir-faire passport"}</strong><br /><span className="text-muted">{locale === "fr" ? "Qui l'a fait, comment, avec quoi" : locale === "ar" ? "من صنعه، كيف، وبأي مواد" : "Who made it, how, and with what"}</span></span>
          </Link>

          <p className="mt-8 whitespace-pre-line leading-relaxed text-charcoal/85">{p.description}</p>

          <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
            {p.materials.length > 0 && (
              <div className="flex justify-between gap-6 py-3"><dt className="text-muted">{m.materials}</dt><dd className="text-end">{p.materials.join(", ")}</dd></div>
            )}
            {(p.deliveryOptions?.length ?? 0) > 0 && (
              <div className="flex justify-between gap-6 py-3"><dt className="text-muted">{m.delivery}</dt><dd className="text-end">{p.deliveryOptions!.map((d) => m[d]).join(" · ")}</dd></div>
            )}
          </dl>

          <div className="mt-8 flex flex-wrap gap-4 text-sm">
            <TrackLink href={`/${locale}/artists/${artist.slug}#contact`} ev={{ kind: "contact_click", artistId: artist.id, productId: p.id, source: "product" }} className="underline decoration-orange underline-offset-4">{m.contact}</TrackLink>
            {artist.acceptsCommissions && (
              <TrackLink href={`/${locale}/artists/${artist.slug}/request`} ev={{ kind: "contact_click", artistId: artist.id, productId: p.id, source: "product_request" }} className="underline decoration-orange underline-offset-4">{m.custom}</TrackLink>
            )}
          </div>
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl">{m.by} {artist.displayName}</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-3">
            {more.map((x) => (
              <li key={x.id}>
                <Link href={`/${locale}/marketplace/${x.id}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)]">
                    <ProductArt images={x.images} category={x.categories[0] ?? ""} alt={x.title} />
                  </div>
                  <p className="mt-2 font-display text-lg group-hover:text-orange-ink">{x.title}</p>
                  <p className="text-sm text-muted">{x.price ? formatMoney(x.price, locale) : t.results.priceOnRequest}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RecoStrip title={recoTitle} note={recoNote} picks={similar} locale={locale} source="similar_product" priceOnRequest={t.results.priceOnRequest} />
    </article>
  );
}
