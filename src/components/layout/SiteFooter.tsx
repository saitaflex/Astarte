import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Wordmark } from "./SiteHeader";

export function SiteFooter({ locale, t }: { locale: Locale; t: Dictionary["footer"] }) {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Wordmark height={120} />
          <p className="mt-1 text-sm text-muted" dir="ltr">
            {t.tagline}
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-6 text-sm text-muted">
          <Link href={`/${locale}/about`} className="hover:text-charcoal">{t.about}</Link>
          <Link href={`/${locale}/privacy`} className="hover:text-charcoal">{t.privacy}</Link>
          <Link href={`/${locale}/terms`} className="hover:text-charcoal">{t.terms}</Link>
        </nav>
      </div>
    </footer>
  );
}

export function DevBanner({ text }: { text: string }) {
  return (
    <div role="note" className="bg-charcoal px-4 py-2 text-center text-xs text-cream/90">
      <span className="me-2 inline-block h-1.5 w-1.5 rounded-full bg-orange align-middle" aria-hidden="true" />
      {text}
    </div>
  );
}
