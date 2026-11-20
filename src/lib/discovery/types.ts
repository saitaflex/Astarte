/** Data shapes shared between the discovery API and the browser. No private fields. */
import type { Money, RecordKind } from "@/lib/data/types";

export interface ResultCard {
  kind: RecordKind;
  id: string;
  title: string;
  subtitle: string | null;
  artist: { name: string; slug: string; city: string | null; isDev: boolean };
  categories: string[];
  image: string | null;
  /** What the chosen picture shows (for the AI explanation); never shown as fact about origin */
  pictureNote?: string | null;
  price: Money | null;
  priceLabel: "fixed" | "from" | "free" | "on_request" | "none";
  availability: string | null;
  startsAt: string | null;
  isOnline: boolean;
  matched: string[];
  unknown: string[];
}

export interface DiscoveryResponse {
  results: ResultCard[];
  /** LLM explanation of the real results. Null when AI is off or failed. */
  explanation: { intro: string; reasons: Record<string, string>; question: string | null } | null;
  ai: "on" | "off" | "error";
  interpreted: { categories: string[]; city: string | null; maxBudget: number | null; kinds: RecordKind[] };
  source: "dev" | "supabase";
}
