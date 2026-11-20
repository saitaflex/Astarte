"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

export interface MapArtist {
  id: string;
  slug: string;
  name: string;
  city: string;
  category: string;
  categoryLabel: string;
  lat: number;
  lng: number;
  privacy: string;
  radiusKm: number | null;
}

interface Labels {
  all: string;
  list: string;
  map: string;
  viewProfile: string;
  city: string;
  category: string;
  none: string;
}

const MapInner = dynamic(() => import("./ArtistMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[22px] bg-cream-deep" />,
});

const GoogleMapInner = dynamic(() => import("./ArtistMapGoogle"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[22px] bg-cream-deep" />,
});

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export function ArtistMap({ artists, locale, labels }: { artists: MapArtist[]; locale: Locale; labels: Labels }) {
  // Google Maps when a key is configured; OpenStreetMap if it is missing or refused.
  const [googleFailed, setGoogleFailed] = useState(false);
  const useGoogle = Boolean(GOOGLE_KEY) && !googleFailed;
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");

  const categories = useMemo(() => [...new Map(artists.map((a) => [a.category, a.categoryLabel])).entries()], [artists]);
  const cities = useMemo(() => [...new Set(artists.map((a) => a.city))].sort(), [artists]);
  const visible = artists.filter((a) => (!category || a.category === category) && (!city || a.city === city));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="sr-only">{labels.category}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-line bg-white px-4 py-2">
            <option value="">{labels.category}: {labels.all}</option>
            {categories.map(([slug, label]) => (
              <option key={slug} value={slug}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">{labels.city}</span>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-full border border-line bg-white px-4 py-2">
            <option value="">{labels.city}: {labels.all}</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="ms-auto flex rounded-full border border-line bg-white p-1 text-sm md:hidden" role="group">
          {(["map", "list"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-full px-4 py-1.5 ${view === v ? "bg-charcoal text-cream" : ""}`}>
              {v === "map" ? labels.map : labels.list}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_320px]">
        <div className={`h-[62vh] min-h-[380px] overflow-hidden rounded-[22px] border border-line ${view === "list" ? "hidden md:block" : ""}`}>
          {useGoogle ? (
            <GoogleMapInner apiKey={GOOGLE_KEY} artists={visible} selected={selected} onSelect={setSelected} locale={locale} viewProfile={labels.viewProfile} onFail={() => setGoogleFailed(true)} />
          ) : (
            <MapInner artists={visible} selected={selected} onSelect={setSelected} locale={locale} viewProfile={labels.viewProfile} />
          )}
        </div>
        <ul className={`max-h-[62vh] space-y-2 overflow-y-auto pe-1 ${view === "map" ? "hidden md:block" : ""}`}>
          {visible.length === 0 && <li className="text-sm text-muted">{labels.none}</li>}
          {visible.map((a) => (
            <li key={a.id}>
              <div
                className={`rounded-[var(--radius-card)] border p-4 transition ${selected === a.id ? "border-orange bg-white" : "border-line bg-white/60"}`}
              >
                <button type="button" onClick={() => setSelected(a.id)} className="block w-full text-start">
                  <span className="block font-display text-lg leading-tight">{a.name}</span>
                  <span className="text-sm text-muted">{a.categoryLabel} · {a.city}</span>
                </button>
                <Link href={`/${locale}/artists/${a.slug}`} className="mt-2 inline-block text-sm text-orange-ink underline-offset-4 hover:underline">
                  {labels.viewProfile} →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
