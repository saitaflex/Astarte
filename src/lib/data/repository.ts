import "server-only";
import { cache } from "react";
import type { ArtEvent, Artist, ArtistPost, Product, Service } from "./types";
import { DEV_ARTISTS, DEV_EVENTS, DEV_PRODUCTS, DEV_SERVICES } from "./dev-seed";

export interface Catalog {
  artists: Artist[];
  products: Product[];
  services: Service[];
  events: ArtEvent[];
}

export interface DataRepository {
  readonly source: "dev" | "supabase";
  /** Approved, public records only. */
  catalog(): Promise<Catalog>;
  artistBySlug(slug: string): Promise<Artist | null>;
  postsByArtist(artistId: string): Promise<ArtistPost[]>;
  artistImages(artistId: string): Promise<{ url: string; caption: string | null; productId: string | null }[]>;
}

class DevRepository implements DataRepository {
  readonly source = "dev" as const;
  async catalog(): Promise<Catalog> {
    return { artists: DEV_ARTISTS, products: DEV_PRODUCTS, services: DEV_SERVICES, events: DEV_EVENTS };
  }
  async artistBySlug(slug: string) {
    return DEV_ARTISTS.find((a) => a.slug === slug) ?? null;
  }
  async postsByArtist() {
    return [];
  }
  async artistImages() {
    return [];
  }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let repo: DataRepository | null = null;

export async function getRepository(): Promise<DataRepository> {
  if (repo) return repo;
  if (isSupabaseConfigured()) {
    const { SupabaseRepository } = await import("./supabase-repository");
    repo = new SupabaseRepository();
  } else {
    repo = new DevRepository();
  }
  return repo;
}

/** One catalog read per request, shared by every component that needs it. */
export const getCatalog = cache(async () => (await getRepository()).catalog());

/** True while demo content is visible, so the UI can label it. */
export async function hasDemoContent() {
  const { artists } = await getCatalog();
  return artists.some((a) => a.isDev);
}
