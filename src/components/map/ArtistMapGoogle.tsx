"use client";

import { AdvancedMarker, APIProvider, InfoWindow, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { MapArtist } from "./ArtistMapLoader";

const TUNISIA_CENTER = { lat: 34.6, lng: 9.8 };

/** Service-area circles (only for artists who chose "area I work in"). */
function ServiceAreas({ artists }: { artists: MapArtist[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const circles = artists
      .filter((a) => a.privacy === "service_area" && a.radiusKm)
      .map((a) => new google.maps.Circle({ map, center: { lat: a.lat, lng: a.lng }, radius: a.radiusKm! * 1000, strokeColor: "#F28C28", strokeWeight: 1, fillColor: "#F28C28", fillOpacity: 0.06, clickable: false }));
    return () => circles.forEach((c) => c.setMap(null));
  }, [map, artists]);
  return null;
}

function FlyTo({ artist }: { artist: MapArtist | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (map && artist) {
      map.panTo({ lat: artist.lat, lng: artist.lng });
      map.setZoom(10);
    }
  }, [map, artist]);
  return null;
}

export default function ArtistMapGoogle({
  apiKey,
  artists,
  selected,
  onSelect,
  locale,
  viewProfile,
  onFail,
}: {
  apiKey: string;
  artists: MapArtist[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  locale: Locale;
  viewProfile: string;
  onFail: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const current = artists.find((a) => a.id === selected);

  // Google calls this global when the key is refused (API not enabled, referrer not allowed…).
  useEffect(() => {
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = onFail;
  }, [onFail]);

  return (
    <APIProvider apiKey={apiKey} language={locale} region="TN" onError={onFail}>
      <Map
        defaultCenter={TUNISIA_CENTER}
        defaultZoom={6}
        mapId="DEMO_MAP_ID"
        gestureHandling="cooperative"
        disableDefaultUI={false}
        streetViewControl={false}
        mapTypeControl={false}
        className="h-full w-full"
      >
        <ServiceAreas artists={artists} />
        <FlyTo artist={current} />
        {artists.map((a) => (
          <AdvancedMarker
            key={a.id}
            position={{ lat: a.lat, lng: a.lng }}
            title={a.name}
            onClick={() => {
              onSelect(a.id);
              setOpen(a.id);
            }}
          >
            <Pin background="#F28C28" borderColor="#171717" glyphColor="#171717" scale={selected === a.id ? 1.3 : 1} />
          </AdvancedMarker>
        ))}
        {open && current && (
          <InfoWindow position={{ lat: current.lat, lng: current.lng }} onCloseClick={() => setOpen(null)} pixelOffset={[0, -36]}>
            <div className="text-sm">
              <strong>{current.name}</strong>
              <br />
              {current.categoryLabel} · {current.city}
              <br />
              <a href={`/${locale}/artists/${current.slug}`} className="underline">
                {viewProfile} →
              </a>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
