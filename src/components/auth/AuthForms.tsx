"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInAction, signUpAction, type FormState } from "@/app/actions/auth";
import { Field, FormError, Select, Submit, TextArea } from "@/components/ui/form";
import type { Locale } from "@/lib/i18n/config";

type L = Record<string, string>;

export function SignInForm({ locale, next, l }: { locale: Locale; next?: string; l: L }) {
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <FormError message={state.error} />
      <Field label={l.email} name="email" type="email" required autoComplete="email" />
      <Field label={l.password} name="password" type="password" required autoComplete="current-password" />
      <Submit className="w-full">{l.signIn}</Submit>
      <p className="text-center text-sm text-muted">
        {l.noAccount} <Link href={`/${locale}/sign-up`} className="text-charcoal underline decoration-orange underline-offset-4">{l.createAccount}</Link>
      </p>
    </form>
  );
}

function Consent({ l, locale }: { l: L; locale: Locale }) {
  return (
    <label className="flex items-start gap-3 text-sm text-muted">
      <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[#F28C28]" />
      <span>
        {l.consent}{" "}
        <Link href={`/${locale}/terms`} className="underline underline-offset-2">{l.terms}</Link> ·{" "}
        <Link href={`/${locale}/privacy`} className="underline underline-offset-2">{l.privacy}</Link>
      </span>
    </label>
  );
}

export function CustomerSignUpForm({ locale, next, l }: { locale: Locale; next?: string; l: L }) {
  const [state, action] = useActionState<FormState, FormData>(signUpAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="accountType" value="customer" />
      {next && <input type="hidden" name="next" value={next} />}
      <FormError message={state.error} />
      <Field label={l.name} name="displayName" required autoComplete="name" />
      <Field label={l.email} name="email" type="email" required autoComplete="email" />
      <Field label={l.password} name="password" type="password" required autoComplete="new-password" hint={l.passwordHint} />
      <Consent l={l} locale={locale} />
      <Submit className="w-full">{l.createAccount}</Submit>
    </form>
  );
}

export function ArtistJoinForm({ locale, l, categories, cities }: { locale: Locale; l: L; categories: { value: string; label: string }[]; cities: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(signUpAction, {});
  const [step, setStep] = useState<1 | 2>(1);
  return (
    <form action={action} className="space-y-5" onSubmit={(e) => { if (step === 1) e.preventDefault(); }}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="accountType" value="artist" />
      <ol className="flex gap-2 text-xs font-medium uppercase tracking-[0.14em]" aria-label="Steps">
        <li className={step === 1 ? "text-orange-ink" : "text-muted"}>1 · {l.stepWork}</li>
        <li className="text-muted">—</li>
        <li className={step === 2 ? "text-orange-ink" : "text-muted"}>2 · {l.stepAccount}</li>
      </ol>
      <FormError message={state.error} />

      {/* Step 1 stays in the DOM (hidden) so its values are submitted with step 2 */}
      <div className={step === 1 ? "space-y-4" : "hidden"}>
        <Field label={l.artistName} name="artistName" required hint={l.artistNameHint} />
        <Select label={l.discipline} name="category" options={categories} required />
        <Select label={l.city} name="city" options={cities.map((c) => ({ value: c, label: c }))} required />
        <Select
          label={l.locationShown}
          name="privacy"
          defaultValue="approximate_city"
          options={[
            { value: "approximate_city", label: l.showCity },
            { value: "service_area", label: l.showArea },
            { value: "hidden", label: l.showHidden },
          ]}
        />
        <TextArea label={l.bio} name="bio" rows={4} maxLength={2000} hint={l.bioHint} />
        <button
          type="button"
          className="w-full rounded-full bg-orange px-5 py-3 font-medium text-charcoal transition hover:bg-orange-soft"
          onClick={(e) => {
            // Validate only step 1 fields, then reveal step 2 without submitting anything.
            const fields = e.currentTarget.parentElement?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select, textarea") ?? [];
            for (const f of Array.from(fields)) if (!f.reportValidity()) return;
            setStep(2);
          }}
        >
          {l.continue}
        </button>
      </div>

      <div className={step === 2 ? "space-y-4" : "hidden"}>
        <Field label={l.name} name="displayName" required={step === 2} autoComplete="name" />
        <Field label={l.email} name="email" type="email" required={step === 2} autoComplete="email" />
        <Field label={l.password} name="password" type="password" required={step === 2} autoComplete="new-password" hint={l.passwordHint} />
        <Consent l={l} locale={locale} />
        <div className="flex gap-3">
          <button type="button" onClick={() => setStep(1)} className="rounded-full border border-line bg-white px-5 py-3">{l.back}</button>
          <Submit className="flex-1">{l.createArtist}</Submit>
        </div>
        <p className="text-xs text-muted">{l.reviewNote}</p>
      </div>
    </form>
  );
}
