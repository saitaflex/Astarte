import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleFavoriteAction } from "@/app/actions/marketplace";
import { EngagementTracker } from "@/components/points/EngagementTracker";
import { PostReader } from "@/components/points/PostReader";
import { TrackLink, TrackView } from "@/components/recommend/Track";
import { ShareButtons } from "@/components/share/ShareButtons";
import { similarArtists } from "@/lib/recommend";
import { Submit } from "@/components/ui/form";
import { getSessionUser } from "@/lib/auth/session";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { Atmosphere } from "@/components/visual/Atmosphere";
import { CategoryIcon } from "@/components/visual/CategoryIcon";
import { CategoryGlyph } from "@/components/visual/CategoryGlyph";
import { CATEGORY_BY_SLUG, categoryName } from "@/lib/data/categories";
import { getRepository } from "@/lib/data/repository";
import { formatDate, formatMoney } from "@/lib/format";
import { pageContext, pick } from "@/lib/i18n/page";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const repo = await getRepository();
  const artist = await repo.artistBySlug(slug);
  if (!artist) return { title: "Artist" };
  // Link previews (WhatsApp, Facebook, X…) show the artist's own approved photo.
  const [img] = await repo.artistImages(artist.id);
  const description = artist.bio.slice(0, 160);
  return {
    title: artist.displayName,
    description,
    openGraph: { title: `${artist.displayName} · Astarte`, description, type: "profile", images: img ? [{ url: img.url, alt: img.caption ?? artist.displayName }] : ["/brand/logo-512.png"] },
    twitter: { card: img ? "summary_large_image" : "summary", title: artist.displayName, description, images: img ? [img.url] : ["/brand/logo-512.png"] },
  };
}

const CONTACT_LABEL = { email: "Email", phone: "Phone", whatsapp: "WhatsApp", instagram: "Instagram", website: "Website" } as const;

export default async function ArtistProfile({ params }: { params: Params }) {
  const { slug } = await params;
  const { locale, t } = await pageContext(params);
  const repo = await getRepository();
  const artist = await repo.artistBySlug(slug);
  if (!artist) notFound();

  const catalog = await repo.catalog();
  const products = catalog.products.filter((p) => p.artistId === artist.id);
  const services = catalog.services.filter((s) => s.artistId === artist.id);
  const events = catalog.events.filter((e) => e.artistId === artist.id);
  const atmosphere = CATEGORY_BY_SLUG.get(artist.primaryCategory)?.atmosphere ?? "design";
  const [posts, images, user] = await Promise.all([repo.postsByArtist(artist.id), repo.artistImages(artist.id), getSessionUser()]);
  const isCustomer = user?.role === "customer";
  let saved = false;
  if (isCustomer) {
    const { data } = await (await supabaseServer()).from("favorites").select("id").eq("customer_id", user!.id).eq("artist_id", artist.id).maybeSingle();
    saved = Boolean(data);
  }
  // Count a view (not the artist's own). Best-effort, never blocks the page.
  if (repo.source === "supabase" && user?.artistId !== artist.id) {
    const admin = supabaseAdmin();
    admin.from("artist_profiles").select("profile_views").eq("id", artist.id).single()
      .then(({ data }) => data && admin.from("artist_profiles").update({ profile_views: data.profile_views + 1 }).eq("id", artist.id))
      .then(undefined, () => undefined);
  }
  const pointsTemplate = pick(locale, { en: "+{n} Point Merci for discovering this artist", fr: "+{n} Point Merci pour cette découverte", ar: "+{n} نقاط ميرسي لاكتشاف هذا الفنان" });

  const L = {
    works: pick(locale, { en: "Works", fr: "Œuvres", ar: "الأعمال" }),
    services: pick(locale, { en: "Services", fr: "Services", ar: "الخدمات" }),
    events: t.nav.events,
    contact: pick(locale, { en: "Contact", fr: "Contact", ar: "التواصل" }),
    noContact: pick(locale, {
      en: "This artist has not made contact details public yet. Send a project request instead.",
      fr: "Cet artiste n'a pas encore rendu ses coordonnées publiques. Envoyez plutôt une demande de projet.",
      ar: "لم ينشر هذا الفنان وسائل التواصل بعد. أرسل طلب مشروع بدلًا من ذلك.",
    }),
    request: pick(locale, { en: "Send a project request", fr: "Envoyer une demande de projet", ar: "أرسل طلب مشروع" }),
    verified: pick(locale, { en: "Verified artist", fr: "Artiste vérifié", ar: "فنان موثّق" }),
    pending: pick(locale, { en: "Verification pending", fr: "Vérification en cours", ar: "التوثيق قيد المراجعة" }),
    placeholderNote: pick(locale, {
      en: "Portfolio images appear here after review. The motifs shown are placeholders.",
      fr: "Les images du portfolio apparaissent ici après validation. Les motifs affichés sont des illustrations provisoires.",
      ar: "تظهر صور الأعمال هنا بعد المراجعة. الزخارف المعروضة مؤقتة.",
    }),
    area: pick(locale, { en: "Works within", fr: "Intervient dans un rayon de", ar: "يعمل ضمن" }),
    near: pick(locale, { en: "Creators close to this one", fr: "Créateurs proches", ar: "مبدعون قريبون" }),
    nearNote: pick(locale, { en: "Machine learning on works, photos and descriptions", fr: "Machine learning sur les œuvres, photos et descriptions", ar: "تعلم آلي على الأعمال والصور والأوصاف" }),
    match: pick(locale, { en: "{n}% match", fr: "{n} % de proximité", ar: "تطابق {n}٪" }),
  };
  const near = repo.source === "supabase" ? await similarArtists(artist.id, 3) : [];

  return (
    <article className="relative isolate">
      <Atmosphere kind={atmosphere} />

      <header className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-16">
        <Link href={`/${locale}/artists`} className="text-sm text-muted hover:text-charcoal">
          ← {t.nav.artists}
        </Link>
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_320px] md:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-orange-ink">
              <CategoryIcon category={artist.primaryCategory} size={36} />
              {artist.categories.map((c) => categoryName(c, locale)).join(" · ")}
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.02] tracking-[-0.02em]">{artist.displayName}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
              {artist.location && artist.location.privacy !== "hidden" && (
                <span>
                  {artist.location.city}, {artist.location.country}
                  {artist.location.privacy === "service_area" && artist.location.serviceRadiusKm
                    ? ` · ${L.area} ${artist.location.serviceRadiusKm} km`
                    : ""}
                </span>
              )}
              {artist.verification === "verified" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-charcoal">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange" aria-hidden="true" /> {L.verified}
                </span>
              )}
              {artist.verification === "pending" && <span className="rounded-full border border-line px-2.5 py-1">{L.pending}</span>}
              {artist.acceptsCommissions && <span className="rounded-full border border-line px-2.5 py-1">{t.results.commissions}</span>}
            </div>
            <div className="mt-4">
              <ShareButtons title={artist.displayName} text={`${artist.displayName} on Astarte`} label={pick(locale, { en: "Share this artist", fr: "Partager cet artiste", ar: "شارك هذا الفنان" })} />
            </div>
          </div>
          <p className="text-[15px] leading-relaxed text-charcoal/85">{artist.bio}</p>
        </div>
      </header>

      {/* Portfolio first: the work is the focus */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6" aria-labelledby="works">
        <h2 id="works" className="sr-only">{L.works}</h2>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {images.slice(0, 9).map((img, i) => (
              <figure key={img.url} className={`relative overflow-hidden rounded-[var(--radius-card)] ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}>
                <Image src={img.url} alt={img.caption ?? artist.displayName} fill sizes={i === 0 ? "50vw" : "25vw"} className="object-cover" priority={i === 0} />
              </figure>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2">
              <div className="relative col-span-2 row-span-2 aspect-square overflow-hidden rounded-[var(--radius-card)] md:aspect-auto">
                <CategoryGlyph category={artist.primaryCategory} />
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] opacity-80">
                  <CategoryGlyph category={artist.categories[i % artist.categories.length] ?? artist.primaryCategory} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">{L.placeholderNote}</p>
          </>
        )}
        <p className="mt-2 text-xs text-muted">
          {pick(locale, {
            en: "Photos are reviewed by the Astarte team. Review is not proof of how a work was made.",
            fr: "Les photos sont examinées par l'équipe Astarte. Cet examen ne prouve pas comment une œuvre a été réalisée.",
            ar: "يراجع فريق Astarte الصور. المراجعة ليست دليلًا على طريقة صنع العمل.",
          })}
        </p>
        {artist.featuredVideo && (
          <figure className="mx-auto mt-8 w-full max-w-sm overflow-hidden rounded-[22px] bg-charcoal">
            <video src={`${artist.featuredVideo}#t=0.5`} controls playsInline preload="metadata" className="max-h-[70vh] w-full" aria-label={`${artist.displayName} video`} />
            <figcaption className="px-4 py-2 text-xs text-cream/70">{pick(locale, { en: `Video · ${artist.displayName}`, fr: `Vidéo · ${artist.displayName}`, ar: `فيديو · ${artist.displayName}` })}</figcaption>
          </figure>
        )}
      </section>

      <div className="mx-auto mt-16 grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-14">
          {posts.length > 0 && (
            <section aria-labelledby="stories">
              <h2 id="stories" className="font-display text-3xl">{pick(locale, { en: "Stories", fr: "Histoires", ar: "القصص" })}</h2>
              <div className="mt-6 space-y-3">
                {posts.map((p) => (
                  <PostReader key={p.id} post={p} canEarn={isCustomer} dateLabel={new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeZone: "Africa/Tunis" }).format(new Date(p.createdAt))} template={pick(locale, { en: "+{n} Point Merci for reading", fr: "+{n} Point Merci pour la lecture", ar: "+{n} نقاط ميرسي للقراءة" })} readLabel={pick(locale, { en: "Read", fr: "Lire", ar: "اقرأ" })} />
                ))}
              </div>
            </section>
          )}
          {products.length > 0 && (
            <section aria-labelledby="products">
              <h2 id="products" className="font-display text-3xl">{L.works}</h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {products.map((p) => (
                  <li key={p.id} className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:gap-6">
                    <div>
                      <h3 className="font-display text-xl">{p.title}</h3>
                      <p className="mt-1 text-sm text-muted">{p.description}</p>
                      {p.materials.length > 0 && <p className="mt-2 text-xs text-muted">{p.materials.join(" · ")}</p>}
                    </div>
                    <div className="text-sm sm:text-end">
                      <p className="font-medium">{p.price ? formatMoney(p.price, locale) : t.results.priceOnRequest}</p>
                      <p className="text-muted">
                        {p.availability === "in_stock" ? t.results.inStock : p.availability === "made_to_order" ? t.results.madeToOrder : t.results.unavailable}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {services.length > 0 && (
            <section aria-labelledby="services">
              <h2 id="services" className="font-display text-3xl">{L.services}</h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {services.map((s) => (
                  <li key={s.id} className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:gap-6">
                    <div>
                      <h3 className="font-display text-xl">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted">{s.description}</p>
                    </div>
                    <div className="text-sm sm:text-end">
                      <p className="font-medium">
                        {s.priceFrom ? `${pick(locale, { en: "From", fr: "À partir de", ar: "ابتداءً من" })} ${formatMoney(s.priceFrom, locale)}` : t.results.priceOnRequest}
                      </p>
                      {s.pricingNote && <p className="text-muted">{s.pricingNote}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {events.length > 0 && (
            <section aria-labelledby="events">
              <h2 id="events" className="font-display text-3xl">{L.events}</h2>
              <ul className="mt-6 grid gap-3">
                {events.map((e) => (
                  <li key={e.id} className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-orange-ink">{formatDate(e.startsAt, locale)}</p>
                    <h3 className="mt-1 font-display text-xl">{e.title}</h3>
                    <p className="mt-1 text-sm text-muted">{e.description}</p>
                    <p className="mt-2 text-sm">
                      {e.isOnline ? t.results.online : e.city}
                      {" · "}
                      {e.pricingMode === "free" ? pick(locale, { en: "Free", fr: "Gratuit", ar: "مجاني" }) : e.price ? formatMoney(e.price, locale) : t.results.priceOnRequest}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start" id="contact">
          <div className="rounded-[22px] border border-line bg-white/80 p-6">
            <h2 className="font-display text-2xl">{L.contact}</h2>
            {artist.contacts.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm">
                {artist.contacts.map((c) => (
                  <li key={c.channel} className="flex justify-between gap-4">
                    <span className="text-muted">{CONTACT_LABEL[c.channel]}</span>
                    <span className="truncate" dir="ltr">{c.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{L.noContact}</p>
            )}
            {artist.acceptsCommissions && (
              <TrackLink
                href={`/${locale}/artists/${artist.slug}/request`}
                ev={{ kind: "contact_click", artistId: artist.id, source: "artist_request" }}
                className="mt-6 block rounded-full bg-orange px-5 py-3 text-center font-medium text-charcoal transition hover:bg-orange-soft"
              >
                {L.request}
              </TrackLink>
            )}
            <form action={toggleFavoriteAction} className="mt-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="artistId" value={artist.id} />
              <input type="hidden" name="back" value={`/${locale}/artists/${artist.slug}`} />
              <Submit variant="ghost" className="w-full">{saved ? "♥ " + pick(locale, { en: "Saved", fr: "Enregistré", ar: "محفوظ" }) : "♡ " + pick(locale, { en: "Save artist", fr: "Enregistrer l'artiste", ar: "احفظ الفنان" })}</Submit>
            </form>
          </div>
        </aside>
        <EngagementTracker activity="profile_discovery" targetId={artist.id} seconds={20} enabled={isCustomer && repo.source === "supabase"} template={pointsTemplate} />
      </div>
      <TrackView kind="view_artist" artistId={artist.id} />
      {near.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-6 pt-16 sm:px-6" aria-label={L.near}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">{L.near}</h2>
            <p className="text-xs text-muted">{L.nearNote}</p>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {near.map(({ artist: a, match }) => (
              <li key={a.id}>
                <TrackLink href={`/${locale}/artists/${a.slug}`} ev={{ kind: "recommendation_click", artistId: a.id, source: "similar_artist" }}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white/80 p-4 transition hover:border-orange">
                  <CategoryIcon category={a.primaryCategory} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg">{a.displayName}</span>
                    <span className="block text-xs text-muted">{categoryName(a.primaryCategory, locale)} · {L.match.replace("{n}", String(match))}</span>
                  </span>
                </TrackLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
