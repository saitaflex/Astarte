import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { localeLabels, locales, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Dropdown } from "./Dropdown";

/** The Astarte logo (tree of flowers with the name in the central band). */
export function Wordmark({ height = 84, className = "" }: { height?: number; className?: string }) {
  // Cropped to the artwork (no empty margin) so the name stays readable at header size.
  return <Image src="/brand/logo-mark.png" alt="Astarte" width={Math.round(height * 0.843)} height={height} priority className={className} style={className ? { width: "auto" } : { height, width: "auto" }} />;
}

export interface HeaderUser {
  role: "customer" | "artist" | "admin";
  displayName: string;
}

export function SiteHeader({ locale, t, user, cartCount }: { locale: Locale; t: Dictionary["nav"]; user: HeaderUser | null; cartCount: number }) {
  const links = [
    { href: "discover", label: t.discover },
    { href: "marketplace", label: t.marketplace },
    { href: "artists", label: t.artists },
    { href: "points", label: t.points },
    { href: "grow", label: t.grow },
  ];
  const home = user?.role === "admin" ? "admin" : user?.role === "artist" ? "studio" : "account";
  const homeLabel = user?.role === "admin" ? t.admin : user?.role === "artist" ? t.studio : t.account;

  return (
    <header className="relative z-40">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} aria-label="Astarte home" className="shrink-0">
          <Wordmark height={92} className="h-[72px] sm:h-[92px]" />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={`/${locale}/${l.href}`} className="text-charcoal/80 transition hover:text-charcoal">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <Dropdown label={locale.toUpperCase()} ariaLabel="Language" summaryClassName="rounded-full px-2 py-1 text-muted hover:text-charcoal" panelClassName="w-36">
            {locales.map((l) => (
              <Link key={l} href={`/${l}`} lang={l} className={`block rounded-lg px-3 py-2 hover:bg-cream ${l === locale ? "text-orange-ink" : ""}`}>
                {localeLabels[l]}
              </Link>
            ))}
          </Dropdown>
          {(!user || user.role === "customer") && (
            <Link href={`/${locale}/cart`} className="relative px-1 text-charcoal/80 hover:text-charcoal" aria-label={`${t.cart} (${cartCount})`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" />
                <path d="M9 7V6a3 3 0 0 1 6 0v1" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -end-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[10px] font-semibold text-charcoal">{cartCount}</span>
              )}
            </Link>
          )}
          {user ? (
            <Dropdown label={user.displayName || homeLabel} summaryClassName="rounded-full border border-line bg-white px-3 py-1.5 text-charcoal">
              <Link href={`/${locale}/${home}`} className="block rounded-lg px-3 py-2 hover:bg-cream">{homeLabel}</Link>
              {user.role === "customer" && <Link href={`/${locale}/points`} className="block rounded-lg px-3 py-2 hover:bg-cream">{t.points}</Link>}
              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="block w-full rounded-lg px-3 py-2 text-start hover:bg-cream">{t.signOut}</button>
              </form>
            </Dropdown>
          ) : (
            <>
              <Link href={`/${locale}/sign-in`} className="hidden text-charcoal/80 hover:text-charcoal sm:inline">
                {t.signIn}
              </Link>
              <Link href={`/${locale}/join`} className="whitespace-nowrap rounded-full bg-charcoal px-4 py-2 text-cream transition hover:bg-charcoal/85">
                {t.join}
              </Link>
            </>
          )}
        </div>
      </div>
      <nav aria-label="Main mobile" className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 pb-2 text-sm lg:hidden">
        {links.map((l) => (
          <Link key={l.href} href={`/${locale}/${l.href}`} className="whitespace-nowrap text-charcoal/75">
            {l.label}
          </Link>
        ))}
        {!user && (
          <Link href={`/${locale}/sign-in`} className="whitespace-nowrap text-charcoal/75 sm:hidden">
            {t.signIn}
          </Link>
        )}
      </nav>
    </header>
  );
}
