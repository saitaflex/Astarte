/**
 * Output guard for LLM explanations. Pure functions so they can be unit-tested.
 * - Drops any ID that was not in the retrieved set.
 * - Strips contact details and links the model might produce.
 * - Caps length so a reply cannot turn into a design proposal.
 */

const PHONE = /(\+?\d[\d\s().-]{6,}\d)/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;

export function sanitizeText(text: unknown, max = 180): string {
  if (typeof text !== "string") return "";
  const clean = text.replace(URL, "").replace(EMAIL, "").replace(PHONE, "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export interface RawExplanation {
  intro?: unknown;
  items?: unknown;
  question?: unknown;
}

export function validateExplanation(raw: RawExplanation, allowedIds: Set<string>) {
  const reasons: Record<string, string> = {};
  const dropped: string[] = [];
  if (Array.isArray(raw.items)) {
    for (const item of raw.items) {
      const id = typeof item?.id === "string" ? item.id : null;
      if (!id) continue;
      if (!allowedIds.has(id)) {
        dropped.push(id);
        continue;
      }
      const reason = sanitizeText(item.reason);
      if (reason) reasons[id] = reason;
    }
  }
  const question = sanitizeText(raw.question, 160) || null;
  return { intro: sanitizeText(raw.intro, 220), reasons, question, dropped };
}

/** Extracts a JSON object even if the model wrapped it in prose or code fences. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(text.slice(start, end + 1));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
