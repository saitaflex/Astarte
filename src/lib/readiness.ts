import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Readiness {
  has_bio: boolean;
  has_location: boolean;
  has_3_products: boolean;
  has_priced_products: boolean;
  has_approved_images: boolean;
  has_post: boolean;
  has_order: boolean;
  facts: {
    bioLength: number;
    products: number;
    published: number;
    unpriced: number;
    withoutPhotos: number;
    approvedImages: number;
    pendingImages: number;
    posts: number;
    orders: number;
    completedOrders: number;
    productViews: number;
    profileViews: number;
  };
}

/** Real facts about an artist's presence, used by the studio checklist, incubation milestones and the guide. */
export async function getReadiness(db: SupabaseClient, artistId: string): Promise<Readiness> {
  const [artist, loc, products, images, posts, orders] = await Promise.all([
    db.from("artist_profiles").select("bio, profile_views").eq("id", artistId).single(),
    db.from("locations").select("city").eq("artist_id", artistId).maybeSingle(),
    db.from("products").select("id, status, price_amount, views").eq("artist_id", artistId).neq("status", "archived"),
    db.from("portfolio_images").select("product_id, moderation_status").eq("artist_id", artistId),
    db.from("artist_posts").select("id", { count: "exact", head: true }).eq("artist_id", artistId),
    db.from("marketplace_orders").select("status").eq("artist_id", artistId),
  ]);
  const prods = products.data ?? [];
  const imgs = images.data ?? [];
  const published = prods.filter((p) => p.status === "published");
  const withPhoto = new Set(imgs.filter((i) => i.moderation_status === "approved" && i.product_id).map((i) => i.product_id));
  const facts = {
    bioLength: (artist.data?.bio ?? "").trim().length,
    products: prods.length,
    published: published.length,
    unpriced: published.filter((p) => p.price_amount == null).length,
    withoutPhotos: published.filter((p) => !withPhoto.has(p.id)).length,
    approvedImages: imgs.filter((i) => i.moderation_status === "approved").length,
    pendingImages: imgs.filter((i) => i.moderation_status === "pending").length,
    posts: posts.count ?? 0,
    orders: (orders.data ?? []).length,
    completedOrders: (orders.data ?? []).filter((o) => o.status === "completed").length,
    productViews: prods.reduce((s, p) => s + (p.views ?? 0), 0),
    profileViews: artist.data?.profile_views ?? 0,
  };
  return {
    has_bio: facts.bioLength >= 80,
    has_location: Boolean(loc.data?.city),
    has_3_products: facts.published >= 3,
    // Showing a price or a clear "price on request" both count; at least one priced work is expected.
    has_priced_products: facts.published > 0 && facts.unpriced < facts.published,
    has_approved_images: facts.approvedImages >= 3,
    has_post: facts.posts > 0,
    has_order: facts.orders > 0,
    facts,
  };
}
