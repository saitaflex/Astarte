"use client";

import "leaflet/dist/leaflet.css";
import { Fragment, useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { Locale } from "@/lib/i18n/config";
import type { MapArtist } from "./ArtistMapLoader";

// Tile source is configurable; OSM's public tiles are fine for a demo but not for heavy production traffic.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TUNISIA_CENTER: [number, number] = [34.6, 9.8];

function FlyTo({ artist }: { artist: MapArtist | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (artist) map.flyTo([artist.lat, artist.lng], 10, { duration: 0.8 });
  }, [artist, map]);
  return null;
}

export default function ArtistMapInner({
  artists,
  selected,
  onSelect,
  locale,
  viewProfile,
}: {
  artists: MapArtist[];
  selected: string | null;
  onSelect: (id: string) => void;
  locale: Locale;
  viewProfile: string;
}) {
  const current = artists.find((a) => a.id === selected);
  return (
    <MapContainer center={TUNISIA_CENTER} zoom={6} scrollWheelZoom className="h-full w-full" style={{ background: "#EDE6DA" }}>
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
      <FlyTo artist={current} />
      {artists.map((a) => (
        <Fragment key={a.id}>
          {a.privacy === "service_area" && a.radiusKm && (
            <Circle center={[a.lat, a.lng]} radius={a.radiusKm * 1000} pathOptions={{ color: "#F28C28", weight: 1, fillOpacity: 0.06 }} />
          )}
          <CircleMarker
            center={[a.lat, a.lng]}
            radius={selected === a.id ? 11 : 8}
            pathOptions={{ color: "#171717", weight: 1.5, fillColor: "#F28C28", fillOpacity: 0.95 }}
            eventHandlers={{ click: () => onSelect(a.id) }}
          >
            <Popup>
              <strong>{a.name}</strong>
              <br />
              {a.categoryLabel} · {a.city}
              <br />
              <a href={`/${locale}/artists/${a.slug}`}>{viewProfile} →</a>
            </Popup>
          </CircleMarker>
        </Fragment>
      ))}
    </MapContainer>
  );
}
