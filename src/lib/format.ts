import type { Money } from "@/lib/data/types";
import type { Locale } from "@/lib/i18n/config";

const intlLocale: Record<Locale, string> = { en: "en-GB", fr: "fr-FR", ar: "ar-TN" };

export function formatMoney(m: Money, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale], { style: "currency", currency: m.currency, maximumFractionDigits: 0 }).format(m.amount);
}

export function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis",
  }).format(new Date(iso));
}
