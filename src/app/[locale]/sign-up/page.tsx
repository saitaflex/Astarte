import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerSignUpForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSessionUser } from "@/lib/auth/session";
import { authLabels } from "@/lib/i18n/auth-labels";
import { pageContext } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale, t } = await pageContext(params);
  const { next } = await searchParams;
  if (await getSessionUser()) redirect(`/${locale}/account`);
  const l = authLabels(locale);
  return (
    <AuthShell
      title={l.signUpTitle}
      lead={l.signUpLead}
      aside={
        <p className="mt-6 text-sm text-muted">
          {t.home.artistCtaTitle} <Link href={`/${locale}/join`} className="text-charcoal underline decoration-orange underline-offset-4">{t.nav.join}</Link>
        </p>
      }
    >
      <CustomerSignUpForm locale={locale} next={next} l={l} />
    </AuthShell>
  );
}
