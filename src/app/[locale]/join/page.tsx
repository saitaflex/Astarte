import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArtistJoinForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSessionUser } from "@/lib/auth/session";
import { CATEGORIES } from "@/lib/data/categories";
import { TUNISIAN_CITIES } from "@/lib/data/cities";
import { authLabels } from "@/lib/i18n/auth-labels";
import { pageContext } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Join as an artist" };

export default async function JoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await pageContext(params);
  const user = await getSessionUser();
  if (user?.role === "artist") redirect(`/${locale}/studio`);
  const l = authLabels(locale);

  return (
    <AuthShell
      title={l.joinTitle}
      lead={l.joinLead}
      aside={
        <ul className="mt-6 space-y-3">
          {l.joinPoints.split("|").map((p) => (
            <li key={p} className="flex items-start gap-3 text-charcoal/85">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      }
    >
      {user ? (
        <p className="rounded-xl border border-line bg-white p-5 text-sm text-muted">
          You are signed in as a customer. Sign out first to create a separate artist account.
        </p>
      ) : (
        <>
          <ArtistJoinForm
            locale={locale}
            l={l}
            categories={CATEGORIES.map((c) => ({ value: c.slug, label: c.name[locale] }))}
            cities={TUNISIAN_CITIES.map((c) => c.name).sort()}
          />
          <p className="mt-6 text-center text-sm text-muted">
            {l.alreadyArtist} <Link href={`/${locale}/sign-in`} className="text-charcoal underline decoration-orange underline-offset-4">{l.signIn}</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
