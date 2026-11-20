/**
 * DEVELOPMENT SAMPLE DATA — NOT REAL ARTISTS.
 *
 * Used only when Supabase is not configured, so the interface can be built and
 * tested. Every name carries the "Demo" label and the UI shows a demo banner.
 * Coordinates are public city centres (approximate-city privacy), not addresses.
 * Never load this file into a production database.
 */
import type { ArtEvent, Artist, Product, Service } from "./types";

const city = (name: string, region: string, lat: number, lng: number) => ({
  city: name,
  region,
  country: "Tunisia",
  point: { lat, lng },
  privacy: "approximate_city" as const,
  serviceRadiusKm: null,
});

export const DEV_ARTISTS: Artist[] = [
  {
    id: "dev-a1", slug: "demo-nabeul-clay-studio", displayName: "Demo · Nabeul Clay Studio",
    bio: "Sample profile. Hand-thrown and hand-painted ceramics in the Nabeul tradition: bowls, plates, tiles and vases with blue and green glazes.",
    primaryCategory: "pottery", categories: ["pottery", "traditional-crafts"], specialties: ["hand-painted ceramics", "glazed tiles"],
    location: city("Nabeul", "Nabeul", 36.4561, 10.7376), acceptsCommissions: true, availability: "accepting", verification: "pending",
    contacts: [{ channel: "email", value: "studio@example.com" }], isDev: true,
  },
  {
    id: "dev-a2", slug: "demo-kairouan-carpets", displayName: "Demo · Kairouan Weaving House",
    bio: "Sample profile. Hand-knotted Kairouan carpets and flat-woven mergoum rugs made on traditional looms.",
    primaryCategory: "textiles", categories: ["textiles", "traditional-crafts"], specialties: ["hand-knotted carpets", "mergoum", "kilim"],
    location: city("Kairouan", "Kairouan", 35.6781, 10.0963), acceptsCommissions: true, availability: "limited", verification: "not_requested",
    contacts: [], isDev: true,
  },
  {
    id: "dev-a3", slug: "demo-sousse-oud-trio", displayName: "Demo · Sousse Oud Trio",
    bio: "Sample profile. Live Tunisian malouf and contemporary oud for weddings, private events and recordings.",
    primaryCategory: "music", categories: ["music", "singing"], specialties: ["oud", "malouf", "weddings"],
    location: { ...city("Sousse", "Sousse", 35.8256, 10.6084), privacy: "service_area", serviceRadiusKm: 80 }, acceptsCommissions: true, availability: "accepting", verification: "verified",
    contacts: [{ channel: "instagram", value: "@demo.oud.trio" }], isDev: true,
  },
  {
    id: "dev-a4", slug: "demo-tunis-oil-painter", displayName: "Demo · Medina Light Painting",
    bio: "Sample profile. Oil and acrylic paintings of Tunis medina streets, doors and light. Original canvases and portrait commissions.",
    primaryCategory: "painting", categories: ["painting"], specialties: ["oil painting", "portraits", "cityscapes"],
    location: city("Tunis", "Tunis", 36.8065, 10.1815), acceptsCommissions: true, availability: "accepting", verification: "pending",
    contacts: [{ channel: "website", value: "https://example.com" }], isDev: true,
  },
  {
    id: "dev-a5", slug: "demo-sfax-woodcraft", displayName: "Demo · Sfax Olive Woodcraft",
    bio: "Sample profile. Olive-wood furniture, tables and kitchenware, finished by hand.",
    primaryCategory: "carpentry", categories: ["carpentry", "furniture-design"], specialties: ["olive wood", "tables", "kitchenware"],
    location: city("Sfax", "Sfax", 34.7406, 10.7603), acceptsCommissions: true, availability: "accepting", verification: "not_requested",
    contacts: [], isDev: true,
  },
  {
    id: "dev-a6", slug: "demo-djerba-silver", displayName: "Demo · Djerba Silver Atelier",
    bio: "Sample profile. Traditional silver jewelry from Djerba: khomsa pendants, filigree earrings and bridal pieces.",
    primaryCategory: "jewelry", categories: ["jewelry", "traditional-crafts"], specialties: ["silver filigree", "bridal jewelry"],
    location: city("Houmt Souk", "Medenine", 33.8752, 10.8575), acceptsCommissions: true, availability: "limited", verification: "pending",
    contacts: [], isDev: true,
  },
  {
    id: "dev-a7", slug: "demo-sidi-bou-said-photo", displayName: "Demo · Blue Door Photography",
    bio: "Sample profile. Editorial, wedding and product photography around Tunis and Sidi Bou Said.",
    primaryCategory: "photography", categories: ["photography", "videography"], specialties: ["weddings", "product photography"],
    location: city("Sidi Bou Said", "Tunis", 36.8687, 10.3417), acceptsCommissions: true, availability: "accepting", verification: "verified",
    contacts: [{ channel: "email", value: "photo@example.com" }], isDev: true,
  },
  {
    id: "dev-a8", slug: "demo-bizerte-leather", displayName: "Demo · Bizerte Leather Works",
    bio: "Sample profile. Hand-stitched leather bags, belts and babouche slippers.",
    primaryCategory: "leather", categories: ["leather", "fashion"], specialties: ["bags", "babouches"],
    location: city("Bizerte", "Bizerte", 37.2744, 9.8739), acceptsCommissions: false, availability: "accepting", verification: "not_requested",
    contacts: [], isDev: true,
  },
  {
    id: "dev-a9", slug: "demo-tozeur-design-studio", displayName: "Demo · Oasis Design Studio",
    bio: "Sample profile. Graphic design and brand identity inspired by desert architecture and brick patterns of Tozeur.",
    primaryCategory: "graphic-design", categories: ["graphic-design", "studios"], specialties: ["brand identity", "posters"],
    location: { ...city("Tozeur", "Tozeur", 33.9197, 8.1335), privacy: "hidden", point: null }, acceptsCommissions: true, availability: "accepting", verification: "not_requested",
    contacts: [], isDev: true,
  },
];

export const DEV_PRODUCTS: Product[] = [
  { id: "dev-p1", artistId: "dev-a1", title: "Hand-painted serving bowl", description: "Large glazed bowl with traditional blue and green Nabeul motifs.", price: { amount: 85, currency: "TND" }, availability: "in_stock", materials: ["clay", "glaze"], categories: ["pottery"] },
  { id: "dev-p2", artistId: "dev-a1", title: "Set of six decorative tiles", description: "Hand-painted ceramic tiles for kitchens and walls. Home decoration.", price: null, availability: "made_to_order", materials: ["clay", "glaze"], categories: ["pottery", "traditional-crafts"] },
  { id: "dev-p3", artistId: "dev-a2", title: "Mergoum wall rug", description: "Flat-woven wool mergoum with geometric patterns. Living room decoration.", price: { amount: 450, currency: "TND" }, availability: "in_stock", materials: ["wool"], categories: ["textiles", "traditional-crafts"] },
  { id: "dev-p4", artistId: "dev-a4", title: "Original oil painting: Medina doorway", description: "Oil on canvas, 60 × 80 cm. A blue medina door in afternoon light.", price: { amount: 1200, currency: "TND" }, availability: "in_stock", materials: ["oil paint", "canvas"], categories: ["painting"] },
  { id: "dev-p5", artistId: "dev-a5", title: "Olive-wood dining table", description: "Solid olive-wood table, made to the customer's dimensions.", price: null, availability: "made_to_order", materials: ["olive wood"], categories: ["carpentry", "furniture-design"] },
  { id: "dev-p6", artistId: "dev-a5", title: "Olive-wood salad bowl", description: "Hand-turned salad bowl, food-safe finish.", price: { amount: 60, currency: "TND" }, availability: "in_stock", materials: ["olive wood"], categories: ["carpentry"] },
  { id: "dev-p7", artistId: "dev-a6", title: "Silver khomsa pendant", description: "Traditional hand-made silver pendant.", price: { amount: 140, currency: "TND" }, availability: "in_stock", materials: ["silver"], categories: ["jewelry", "traditional-crafts"] },
  { id: "dev-p8", artistId: "dev-a8", title: "Leather tote bag", description: "Hand-stitched natural leather tote.", price: { amount: 220, currency: "TND" }, availability: "unavailable", materials: ["leather"], categories: ["leather", "fashion"] },
];

export const DEV_SERVICES: Service[] = [
  { id: "dev-s1", artistId: "dev-a3", title: "Live music for weddings", description: "Oud trio for weddings and private celebrations, traditional and modern repertoire.", priceFrom: { amount: 900, currency: "TND" }, pricingNote: "Depends on duration and travel", categories: ["music", "singing"] },
  { id: "dev-s2", artistId: "dev-a4", title: "Portrait commission", description: "Painted portrait from a sitting or photographs. The artist discusses format and style with you.", priceFrom: null, pricingNote: null, categories: ["painting"] },
  { id: "dev-s3", artistId: "dev-a7", title: "Wedding photography", description: "Full-day wedding coverage with edited gallery.", priceFrom: { amount: 1500, currency: "TND" }, pricingNote: null, categories: ["photography"] },
  { id: "dev-s4", artistId: "dev-a7", title: "Product photography for artisans", description: "Studio photos of your products for catalogues and online shops.", priceFrom: { amount: 300, currency: "TND" }, pricingNote: "Per session", categories: ["photography"] },
  { id: "dev-s5", artistId: "dev-a9", title: "Brand identity", description: "Logo, colours and printed materials for small businesses and festivals.", priceFrom: null, pricingNote: "Quoted per project", categories: ["graphic-design"] },
];

const inDays = (d: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const DEV_EVENTS: ArtEvent[] = [
  { id: "dev-e1", artistId: "dev-a1", slug: "demo-pottery-workshop", title: "Beginner pottery workshop", description: "Three hours at the wheel. Clay and firing included.", type: "workshop", startsAt: inDays(6, 10), endsAt: inDays(6, 13), isOnline: false, city: "Nabeul", price: { amount: 45, currency: "TND" }, pricingMode: "paid_pay_organizer", capacity: 8, categories: ["pottery"] },
  { id: "dev-e2", artistId: "dev-a4", slug: "demo-medina-exhibition", title: "Medina Light: open exhibition", description: "New paintings shown in the studio. Free entry.", type: "exhibition", startsAt: inDays(12, 17), endsAt: inDays(12, 21), isOnline: false, city: "Tunis", price: null, pricingMode: "free", capacity: null, categories: ["painting"] },
  { id: "dev-e3", artistId: "dev-a3", slug: "demo-malouf-evening", title: "Malouf evening", description: "An evening of Tunisian malouf.", type: "performance", startsAt: inDays(9, 20), endsAt: inDays(9, 22), isOnline: false, city: "Sousse", price: { amount: 30, currency: "TND" }, pricingMode: "paid_pay_organizer", capacity: 60, categories: ["music"] },
  { id: "dev-e4", artistId: "dev-a7", slug: "demo-online-photo-class", title: "Photographing your crafts (online)", description: "A 90-minute online class on lighting and framing your products with a phone.", type: "masterclass", startsAt: inDays(4, 18), endsAt: inDays(4, 19), isOnline: true, city: null, price: null, pricingMode: "free", capacity: 40, categories: ["photography"] },
];
