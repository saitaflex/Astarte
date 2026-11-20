import "server-only";
import { supabasePublic } from "@/lib/supabase/server";
import type { Catalog, DataRepository } from "./repository";
import type { ArtEvent, Artist, ArtistPost, GalleryImage, Product, Service } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const money = (amount: number | string | null, currency: string | null) =>
  amount == null ? null : { amount: Number(amount), currency: (currency ?? "TND") as "TND" };

export function publicImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-images/${path}`;
}

export function toArtist(r: any): Artist {
  return {
    id: r.id,
    slug: r.slug,
    displayName: r.display_name,
    bio: r.bio ?? "",
    primaryCategory: r.primary_category,
    categories: r.categories ?? [r.primary_category],
    specialties: r.specialties ?? [],
    location: r.city
      ? {
          city: r.city,
          region: r.region ?? "",
          country: r.country ?? "Tunisia",
          point: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
          privacy: r.privacy,
          serviceRadiusKm: r.service_radius_km,
        }
      : null,
    acceptsCommissions: r.accepts_commissions,
    availability: r.availability,
    verification: r.verification_status,
    contacts: r.public_contacts ?? [],
    isDev: r.is_demo,
    featuredVideo: r.featured_video_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-media/${r.featured_video_path}` : null,
  };
}

export function toProduct(r: any, images: Map<string, string[]>): Product {
  return {
    id: r.id,
    artistId: r.artist_id,
    title: r.title,
    description: r.description ?? "",
    price: money(r.price_amount, r.currency),
    availability: r.availability,
    materials: r.materials ?? [],
    categories: (r.product_categories ?? []).map((c: any) => c.category_slug),
    stock: r.stock,
    deliveryOptions: r.delivery_options ?? [],
    featured: r.featured,
    images: images.get(r.id) ?? [],
    createdAt: r.created_at,
    passport: {
      technique: r.technique ?? null,
      originCity: r.origin_city ?? null,
      hoursToMake: r.hours_to_make != null ? Number(r.hours_to_make) : null,
      localMaterials: r.local_materials ?? null,
      recycledMaterials: r.recycled_materials ?? null,
      repairable: r.repairable ?? null,
      care: r.care_instructions ?? null,
    },
  };
}

export class SupabaseRepository implements DataRepository {
  readonly source = "supabase" as const;

  async catalog(): Promise<Catalog> {
    const db = supabasePublic();
    const [a, p, s, e, img] = await Promise.all([
      db.from("public_artists").select("*").order("created_at"),
      db.from("products").select("*, product_categories(category_slug)").eq("status", "published").order("created_at", { ascending: false }),
      db.from("services").select("*, service_categories(category_slug)").eq("status", "published"),
      db.from("events").select("*").eq("status", "published").gte("ends_at", new Date().toISOString()).order("starts_at"),
      db.from("public_images").select("artist_id, product_id, public_path, sort, caption, ai_description, tags").order("sort"),
    ]);
    for (const res of [a, p, s, e, img]) if (res.error) throw new Error(`Supabase: ${res.error.message}`);

    const covers = new Map<string, string>();
    const images = new Map<string, string[]>();
    const galleries = new Map<string, GalleryImage[]>();
    for (const row of img.data ?? []) {
      if (!covers.has(row.artist_id)) covers.set(row.artist_id, publicImageUrl(row.public_path));
      const g = galleries.get(row.artist_id) ?? [];
      g.push({ url: publicImageUrl(row.public_path), productId: row.product_id, caption: row.caption, description: row.ai_description, tags: row.tags ?? [] });
      galleries.set(row.artist_id, g);
      if (!row.product_id) continue;
      const list = images.get(row.product_id) ?? [];
      list.push(publicImageUrl(row.public_path));
      images.set(row.product_id, list);
    }
    // Real artists first, demo samples after.
    const artists = (a.data ?? [])
      .map((r: any) => ({ ...toArtist(r), coverImage: covers.get(r.id) ?? null, gallery: galleries.get(r.id) ?? [] }))
      .sort((x: Artist, y: Artist) => Number(x.isDev) - Number(y.isDev));
    const visible = new Set(artists.map((x: Artist) => x.id));

    const products: Product[] = (p.data ?? []).filter((r: any) => visible.has(r.artist_id)).map((r: any) => toProduct(r, images));
    const services: Service[] = (s.data ?? []).filter((r: any) => visible.has(r.artist_id)).map((r: any) => ({
      id: r.id, artistId: r.artist_id, title: r.title, description: r.description ?? "",
      priceFrom: money(r.price_from, r.currency), pricingNote: r.pricing_note,
      categories: (r.service_categories ?? []).map((c: any) => c.category_slug),
    }));
    const events: ArtEvent[] = (e.data ?? []).filter((r: any) => r.artist_id && visible.has(r.artist_id)).map((r: any) => ({
      id: r.id, artistId: r.artist_id, slug: r.slug, title: r.title, description: r.description ?? "",
      type: r.type, startsAt: r.starts_at, endsAt: r.ends_at, isOnline: r.is_online, city: r.city,
      price: money(r.price_amount, r.currency), pricingMode: r.pricing_mode, capacity: r.capacity,
      categories: r.categories ?? [],
    }));
    return { artists, products, services, events };
  }

  async artistBySlug(slug: string) {
    const { data, error } = await supabasePublic().from("public_artists").select("*").eq("slug", slug).maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return data ? toArtist(data) : null;
  }

  async postsByArtist(artistId: string): Promise<ArtistPost[]> {
    const { data } = await supabasePublic().from("artist_posts").select("*").eq("artist_id", artistId).eq("status", "published").order("created_at", { ascending: false });
    return (data ?? []).map((r: any) => ({ id: r.id, artistId: r.artist_id, kind: r.kind, title: r.title, body: r.body, createdAt: r.created_at }));
  }

  async artistImages(artistId: string): Promise<{ url: string; caption: string | null; productId: string | null }[]> {
    const { data } = await supabasePublic().from("public_images").select("public_path, caption, product_id").eq("artist_id", artistId).order("sort");
    return (data ?? []).map((r: any) => ({ url: publicImageUrl(r.public_path), caption: r.caption, productId: r.product_id }));
  }
}
