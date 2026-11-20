import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import { getDictionary } from "./dictionaries";

export async function pageContext(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale: locale as Locale, t: getDictionary(locale) };
}

/** Picks the right string for the current locale from an inline {en, fr, ar} object. */
export function pick<T>(locale: Locale, values: { en: T; fr: T; ar: T }): T {
  return values[locale];
}
