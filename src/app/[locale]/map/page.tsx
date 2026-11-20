import type { Metadata } from "next";
import { ArtistMap, type MapArtist } from "@/components/map/ArtistMapLoader";
import { categoryName } from "@/lib/data/categories";
import { getCatalog } from "@/lib/data/repository";
import { pageContext, pick } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t } = await pageContext(params);
  const { artists } = await getCatalog();

  // Only artists who chose a visible location get a marker. No location, no marker.
  const mapped: MapArtist[] = artists
    .filter((a) => a.location?.point && a.location.privacy !== "hidden")
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.displayName,
      city: a.location!.city,
      category: a.primaryCategory,
      categoryLabel: categoryName(a.primaryCategory, locale),
      lat: a.location!.point!.lat,
      lng: a.location!.point!.lng,
      privacy: a.location!.privacy,
      radiusKm: a.location!.serviceRadiusKm,
    }));
  const hiddenCount = artists.length - mapped.length;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">{t.home.mapTitle}</h1>
      <p className="mt-2 text-sm text-muted">
        {pick(locale, {
          en: "Locations are shown at the level each artist chose: workshop, city or service area.",
          fr: "Les lieux sont affichés au niveau choisi par chaque artiste : atelier, ville ou zone d'intervention.",
          ar: "تُعرض المواقع بالمستوى الذي اختاره كل فنان: الورشة أو المدينة أو منطقة العمل.",
        })}
        {hiddenCount > 0 &&
          ` ${pick(locale, {
            en: `${hiddenCount} artist(s) keep their location private.`,
            fr: `${hiddenCount} artiste(s) gardent leur localisation privée.`,
            ar: `${hiddenCount} فنان(ين) يحتفظون بموقعهم خاصًا.`,
          })}`}
      </p>
      <ArtistMap
        artists={mapped}
        locale={locale}
        labels={{ all: t.common.all, list: t.common.list, map: t.common.mapView, viewProfile: t.results.viewProfile, city: t.common.city, category: t.common.category, none: t.results.none }}
      />
    </div>
  );
}
