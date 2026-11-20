import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requestCustomWorkAction } from "@/app/actions/marketplace";
import { Field, Submit, TextArea } from "@/components/ui/form";
import { getSessionUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/repository";
import { marketLabels } from "@/lib/i18n/market-labels";
import { pageContext } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Custom request" };

export default async function RequestPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const { locale, t } = await pageContext(params);
  const { error } = await searchParams;
  const m = marketLabels(locale);
  const artist = await (await getRepository()).artistBySlug(slug);
  if (!artist || !artist.acceptsCommissions) notFound();
  const user = await getSessionUser();

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
      <Link href={`/${locale}/artists/${slug}`} className="text-sm text-muted hover:text-charcoal">← {artist.displayName}</Link>
      <h1 className="mt-4 font-display text-4xl">{m.requestTitle}</h1>
      <p className="mt-2 text-muted">{m.requestLead}</p>
      {!user ? (
        <p className="mt-8 rounded-xl border border-line bg-white p-5 text-sm">
          <Link href={`/${locale}/sign-in?next=/${locale}/artists/${slug}/request`} className="underline decoration-orange underline-offset-4">{t.nav.signIn}</Link>
        </p>
      ) : user.role !== "customer" ? (
        <p className="mt-8 rounded-xl border border-line bg-white p-5 text-sm">{m.customersOnly}</p>
      ) : (
        <form action={requestCustomWorkAction} className="mt-8 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="artistId" value={artist.id} />
          <input type="hidden" name="slug" value={slug} />
          {error && <p role="alert" className="rounded-xl bg-orange/10 px-4 py-3 text-sm">{error}</p>}
          <TextArea label={m.what} name="what" rows={5} required maxLength={1500} />
          <Field label={m.dims} name="dimensions" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={m.budget} name="budget" type="number" min={0} />
            <Field label={m.deadline} name="deadline" type="date" />
          </div>
          <Field label={m.yourCity} name="city" />
          <Submit>{m.send}</Submit>
        </form>
      )}
    </div>
  );
}
