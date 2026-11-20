/** Text normalisation shared by search and the Arabizi dictionary. Pure functions, no I/O. */

const ARABIC_DIACRITICS = /[ً-ْٰـ]/g;

export function normalizeArabic(text: string): string {
  return text
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

export function hasArabicScript(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

/** Lowercase, strip Latin accents, normalise Arabic letters, collapse spaces. */
export function normalizeText(text: string): string {
  const latin = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return normalizeArabic(latin).replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * Arabizi skeleton: maps chat-alphabet digits to letters, then drops vowels and
 * doubled letters so spelling variants collapse to the same key.
 * "fa5ar", "fakhar" and "fakhaar" all become "fkhr".
 */
export function arabiziSkeleton(token: string): string {
  let t = token.toLowerCase();
  t = t.replace(/5/g, "kh").replace(/7/g, "h").replace(/9/g, "q").replace(/8/g, "gh").replace(/3/g, "").replace(/2/g, "");
  t = t.replace(/sh/g, "ch").replace(/q/g, "k").replace(/ou/g, "u");
  t = t.replace(/[aeiouy]/g, "");
  t = t.replace(/(.)\1+/g, "$1");
  return t;
}

export function tokenize(text: string): string[] {
  return normalizeText(text).split(" ").filter((t) => t.length > 1);
}

/** Edit distance of at most one; used for small typo tolerance. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
