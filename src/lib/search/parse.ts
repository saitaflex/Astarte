/**
 * Keyword parser: turns a free-text request into a structured SearchFilter.
 * Works without any AI provider and is the fallback when the LLM is unavailable.
 * Handles English, French, Arabic script and Arabizi via the shared dictionary.
 */
import type { RecordKind, SearchFilter } from "@/lib/data/types";
import { CITIES, TERMS, type TermEntry } from "./dictionary";
import { arabiziSkeleton, hasArabicScript, normalizeText, tokenize, withinOneEdit } from "./normalize";

interface Indexed {
  exact: Map<string, TermEntry[]>;
  skeleton: Map<string, TermEntry[]>;
  phrases: { phrase: string; entry: TermEntry }[];
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

const index: Indexed = (() => {
  const exact = new Map<string, TermEntry[]>();
  const skeleton = new Map<string, TermEntry[]>();
  const phrases: Indexed["phrases"] = [];
  for (const entry of TERMS) {
    for (const raw of entry.terms) {
      const term = normalizeText(raw);
      if (term.includes(" ")) phrases.push({ phrase: term, entry });
      else {
        push(exact, term, entry);
        if (!hasArabicScript(term) && term.length >= 4) push(skeleton, arabiziSkeleton(term), entry);
      }
    }
  }
  return { exact, skeleton, phrases };
})();

const cityIndex = CITIES.flatMap((c) => c.terms.map((t) => ({ term: normalizeText(t), city: c.city })));

export const STOP_WORDS = new Set(
  "under below over less than more cheap budget price dinar dinars tnd dt moins prix a an the for and or of in on at to with my me i want need looking find some any from near this that is are une un des de du la le les pour et ou en au aux avec je veux cherche nheb n7eb nhab fi fil lel w ya من في على الى إلى مع اريد أريد نحب عن هذا هذه".split(" "),
);

export interface ParseResult {
  filter: SearchFilter;
  /** Tokens that matched a dictionary entry (for explanations). */
  matchedTerms: string[];
  eventTypes: string[];
}

function lookup(token: string): TermEntry[] {
  const direct = index.exact.get(token);
  if (direct) return direct;
  if (hasArabicScript(token)) {
    // Arabic: allow the definite article "ال" prefix
    if (token.startsWith("ال")) return index.exact.get(token.slice(2)) ?? [];
    return [];
  }
  if (token.length >= 4) {
    const sk = index.skeleton.get(arabiziSkeleton(token));
    if (sk) return sk;
  }
  if (token.length >= 5) {
    for (const [term, entries] of index.exact) {
      if (term.length >= 5 && withinOneEdit(token, term)) return entries;
    }
  }
  // English plurals
  if (token.endsWith("s") && token.length > 4) return index.exact.get(token.slice(0, -1)) ?? [];
  return [];
}

function parseBudget(text: string): number | null {
  const t = normalizeText(text);
  const before = t.match(/(?:under|below|max|maximum|less than|up to|moins de|max|jusqu a|budget|اقل من|حد|لا يتجاوز)\s*(\d{2,6})/);
  if (before) return Number(before[1]);
  const after = t.match(/(\d{2,6})\s*(?:tnd|dt|dinars?|د ت|دينار|dinar)/);
  if (after) return Number(after[1]);
  return null;
}

export function parseQuery(text: string): ParseResult {
  const normalized = normalizeText(text);
  const tokens = tokenize(text).filter((t) => !STOP_WORDS.has(t));

  const categories = new Set<string>();
  const kinds = new Set<RecordKind | "commission">();
  const eventTypes = new Set<string>();
  const matchedTerms: string[] = [];
  const freeText: string[] = [];

  const apply = (entry: TermEntry) => {
    if (entry.category) categories.add(entry.category);
    if (entry.kind) kinds.add(entry.kind);
    if (entry.eventType) eventTypes.add(entry.eventType);
  };

  for (const { phrase, entry } of index.phrases) {
    if (normalized.includes(phrase)) {
      apply(entry);
      matchedTerms.push(phrase);
    }
  }

  let city: string | null = null;
  for (const { term, city: name } of cityIndex) {
    if (term.includes(" ") ? normalized.includes(term) : tokens.includes(term) || tokens.includes(`ب${term}`)) {
      city = name;
      break;
    }
  }

  for (const token of tokens) {
    if (/^\d+$/.test(token)) continue;
    if (cityIndex.some((c) => c.term === token)) continue;
    const entries = lookup(token);
    if (entries.length) {
      entries.forEach(apply);
      matchedTerms.push(token);
    } else {
      freeText.push(token);
    }
  }

  let recordKinds: RecordKind[] = [];
  if (kinds.has("event")) recordKinds = ["event"];
  else if (kinds.has("commission")) recordKinds = ["artist", "service"];
  else if (kinds.has("service")) recordKinds = ["service", "artist"];

  return {
    filter: {
      // All meaningful words (recognised craft words too), so titles and photo descriptions
      // can match them. City names and numbers are handled by their own filters.
      text: [...new Set([...freeText, ...matchedTerms.filter((t) => !t.includes(" "))])].join(" "),
      kinds: recordKinds,
      categories: [...categories],
      city,
      maxBudget: parseBudget(text),
      upcomingOnly: true,
    },
    matchedTerms,
    eventTypes: [...eventTypes],
  };
}
