export type Atmosphere = "music" | "paint" | "clay" | "textile" | "photo" | "design" | "material";

export interface Category {
  slug: string;
  name: { en: string; fr: string; ar: string };
  atmosphere: Atmosphere;
}

export type LocationPrivacy = "public_workshop" | "approximate_city" | "service_area" | "hidden";

export interface ArtistLocation {
  city: string;
  region: string;
  country: string;
  /** Only present when privacy allows a marker. Already rounded for public use. */
  point: { lat: number; lng: number } | null;
  privacy: LocationPrivacy;
  serviceRadiusKm: number | null;
}

export type Availability = "in_stock" | "made_to_order" | "unavailable";

export interface Money {
  amount: number;
  currency: "TND" | "EUR" | "USD";
}

export interface PublicContact {
  channel: "email" | "phone" | "whatsapp" | "instagram" | "website";
  value: string;
}

export interface Artist {
  id: string;
  slug: string;
  displayName: string;
  bio: string;
  primaryCategory: string;
  categories: string[];
  specialties: string[];
  location: ArtistLocation | null;
  acceptsCommissions: boolean;
  availability: "accepting" | "limited" | "not_accepting";
  verification: "not_requested" | "pending" | "verified";
  /** Only contacts the artist marked public */
  contacts: PublicContact[];
  isDev: boolean;
  /** First approved public image, if any */
  coverImage?: string | null;
  /** Approved pictures with what they show (caption + AI description + tags), for picture-aware search */
  gallery?: GalleryImage[];
  featuredVideo?: string | null;
}

export interface GalleryImage {
  url: string;
  productId: string | null;
  caption: string | null;
  description: string | null;
  tags: string[];
}

export interface Product {
  id: string;
  artistId: string;
  title: string;
  description: string;
  price: Money | null;
  availability: Availability;
  materials: string[];
  categories: string[];
  stock?: number | null;
  deliveryOptions?: ("pickup" | "local_delivery" | "shipping")[];
  featured?: boolean;
  images?: string[];
  createdAt?: string;
}

export interface ArtistPost {
  id: string;
  artistId: string;
  kind: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface Service {
  id: string;
  artistId: string;
  title: string;
  description: string;
  priceFrom: Money | null;
  pricingNote: string | null;
  categories: string[];
}

export type EventType =
  | "workshop"
  | "masterclass"
  | "exhibition"
  | "open_studio"
  | "market"
  | "performance"
  | "commission_day";

export interface ArtEvent {
  id: string;
  artistId: string;
  slug: string;
  title: string;
  description: string;
  type: EventType;
  startsAt: string;
  endsAt: string;
  isOnline: boolean;
  city: string | null;
  price: Money | null;
  pricingMode: "free" | "paid_pay_organizer" | "donation" | "price_on_request";
  capacity: number | null;
  categories: string[];
}

export type RecordKind = "artist" | "product" | "service" | "event";

export interface SearchFilter {
  text: string;
  kinds: RecordKind[];
  categories: string[];
  city: string | null;
  maxBudget: number | null;
  upcomingOnly: boolean;
}

export interface SearchHit {
  kind: RecordKind;
  id: string;
  score: number;
  matched: string[];
  unknown: string[];
}
