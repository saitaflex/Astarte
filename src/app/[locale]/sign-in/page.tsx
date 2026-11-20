import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import { getSessionUser } from "@/lib/auth/session";
import { authLabels } from "@/lib/i18n/auth-labels";
import { pageContext } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await pageContext(params);
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(`/${locale}/${user.role === "admin" ? "admin" : user.role === "artist" ? "studio" : "account"}`);
  const l = authLabels(locale);
  return (
    <AuthShell title={l.signInTitle}>
      <SignInForm locale={locale} next={next} l={l} />
    </AuthShell>
  );
}
