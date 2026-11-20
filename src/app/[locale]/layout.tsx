import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans_Arabic, Inter_Tight, Noto_Naskh_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { DevBanner, SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSessionUser } from "@/lib/auth/session";
import { hasDemoContent, isSupabaseConfigured } from "@/lib/data/repository";
import { dirFor, isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { supabaseServer } from "@/lib/supabase/server";
import "../globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const inter = Inter_Tight({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600"], variable: "--font-arabic", display: "swap" });
const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["500", "600"], variable: "--font-arabic-display", display: "swap" });

// Pages show live data and the signed-in state, so they render per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://astarte-art.vercel.app"),
  openGraph: { siteName: "Astarte", images: ["/brand/logo-512.png"] },
  title: { default: "Astarte — Real People. Real Creativity.", template: "%s · Astarte" },
  description: "Discover real Tunisian artists, artisans and creative studios. AI helps you find people, never replaces them.",
};

export const viewport: Viewport = { themeColor: "#F5F1EA" };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

async function cartCount(userId: string | undefined) {
  if (!userId) return 0;
  const db = await supabaseServer();
  const { data } = await db.from("shopping_cart_items").select("quantity").eq("customer_id", userId);
  return (data ?? []).reduce((n, r) => n + r.quantity, 0);
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const configured = isSupabaseConfigured();
  const [user, demo] = await Promise.all([configured ? getSessionUser() : null, hasDemoContent()]);
  const count = user?.role === "customer" ? await cartCount(user.id) : 0;

  return (
    <html lang={locale} dir={dirFor(locale)} className={`${fraunces.variable} ${inter.variable} ${plexArabic.variable} ${naskh.variable}`}>
      <body className="min-h-dvh">
        {demo && <DevBanner text={t.devBanner} />}
        <SiteHeader locale={locale} t={t.nav} user={user ? { role: user.role, displayName: user.displayName } : null} cartCount={count} />
        <main id="main">{children}</main>
        <SiteFooter locale={locale} t={t.footer} />
      </body>
    </html>
  );
}
