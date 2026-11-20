import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductArt } from "@/components/market/ProductArt";
import { CategoryIcon } from "@/components/visual/CategoryIcon";
import { categoryName } from "@/lib/data/categories";
import { getCatalog } from "@/lib/data/repository";
import { pageContext } from "@/lib/i18n/page";
import { passportLabels, passportUrl, qrSvg } from "@/lib/passport";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { products } = await getCatalog();
  const p = products.find((x) => x.id === id);
  return { title: p ? `Passeport · ${p.title}` : "Passeport", openGraph: p?.images?.[0] ? { images: [p.images[0]] } : undefined };
}

export default async function PassportPage({ params, searchParams }: { params: Params; searchParams: Promise<{ scan?: string }> }) {
  const { id } = await params;
  const { locale } = await pageContext(params);
  const { scan } = await searchParams;
  const { products, artists } = await getCatalog();
  const p = products.find((x) => x.id === id);
  if (!p) notFound();
  const artist = artists.find((a) => a.id === p.artistId);
  if (!artist) notFound();
  const l = passportLabels(locale);
  const pp = p.passport;

  // Count QR scans (best effort, never blocks the page).
  if (scan === "1") {
    const db = supabaseAdmin();
    db.from("products").select("passport_scans").eq("id", p.id).single()
      .then(({ data }) => data && db.from("products").update({ passport_scans: data.passport_scans + 1 }).eq("id", p.id))
      .then(undefined, () => undefined);
  }

  const qr = await qrSvg(passportUrl(locale, p.id));
  const bool = (v: boolean | null | undefined) => (v == null ? l.notProvided : v ? l.yes : l.no);

  // Durability points come only from what is true or declared — nothing estimated.
  const why = [
    l.handmade,
    p.availability === "made_to_order" ? l.toOrder : null,
    p.deliveryOptions?.some((d) => d === "pickup" || d === "local_delivery") ? l.pickup : null,
    pp?.localMaterials ? l.localWhy : null,
    pp?.recycledMaterials ? l.recycledWhy : null,
    pp?.repairable ? l.repairWhy : null,
  ].filter(Boolean) as string[];

  const rows: [string, string][] = [
    [l.maker, artist.displayName],
    [l.technique, pp?.technique ?? l.notProvided],
    [l.materials, p.materials.length ? p.materials.join(", ") : l.notProvided],
    [l.origin, pp?.originCity ?? (artist.location && artist.location.privacy !== "hidden" ? artist.location.city : l.notProvided)],
    [l.time, pp?.hoursToMake ? l.hours.replace("{n}", String(pp.hoursToMake)) : l.notProvided],
    [l.local, bool(pp?.localMaterials)],
    [l.recycled, bool(pp?.recycledMaterials)],
    [l.repairable, bool(pp?.repairable)],
    [l.care, pp?.care ?? l.notProvided],
  ];

  return (
    <article className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-orange-ink">
        <CategoryIcon category={p.categories[0] ?? artist.primaryCategory} size={32} />
        {l.title}
      </p>
      <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] leading-[1.05]">{p.title}</h1>
      <p className="mt-2 text-muted">
        {p.categories.map((c) => categoryName(c, locale)).join(" · ")} — {l.maker}{" "}
        <Link href={`/${locale}/artists/${artist.slug}`} className="text-charcoal underline decoration-orange/60 underline-offset-4">{artist.displayName}</Link>
      </p>
      {artist.isDev && (
        <p className="mt-4 rounded-[var(--radius-card)] border border-orange/50 bg-orange/10 px-4 py-3 text-sm">{l.demo}</p>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="group relative aspect-[4/5] overflow-hidden rounded-[22px]">
          <ProductArt images={p.images} category={p.categories[0] ?? ""} alt={p.title} sizes="(max-width: 768px) 100vw, 50vw" priority />
        </div>

        <div className="space-y-6">
          <dl className="divide-y divide-line rounded-[22px] border border-line bg-white/80 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[150px_1fr] gap-4 px-5 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className={v === l.notProvided ? "text-muted italic" : ""}>{v}</dd>
              </div>
            ))}
          </dl>

          <section className="rounded-[22px] bg-charcoal p-6 text-cream">
            <h2 className="font-display text-2xl">{l.why}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {why.map((w) => (
                <li key={w} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" aria-hidden="true" />{w}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-cream/70">{l.honest}</p>
          </section>

          <section className="rounded-[22px] border border-line bg-white/70 p-5 text-sm">
            <h2 className="font-display text-xl">{l.authenticity}</h2>
            <p className="mt-1 text-muted">{l.reviewed}</p>
          </section>

          <div className="flex items-center gap-5 rounded-[22px] border border-line bg-white/70 p-5">
            <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: qr }} aria-label={l.scan} role="img" />
            <div className="space-y-2 text-sm">
              <p className="text-muted">{l.scan}</p>
              <Link href={`/${locale}/passport/${p.id}/card`} className="inline-block rounded-full bg-orange px-4 py-2 font-medium">{l.print}</Link>
              <div className="flex gap-4">
                <Link href={`/${locale}/marketplace/${p.id}`} className="underline decoration-orange underline-offset-4">{l.buy}</Link>
                <Link href={`/${locale}/artists/${artist.slug}`} className="underline decoration-orange underline-offset-4">{l.profile}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
