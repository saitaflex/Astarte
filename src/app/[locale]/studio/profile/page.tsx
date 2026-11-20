import type { Metadata } from "next";
import { updateProfileAction } from "@/app/actions/studio";
import { Notice } from "@/components/dashboard/DashShell";
import { Field, Select, Submit, TextArea } from "@/components/ui/form";
import { CATEGORIES } from "@/lib/data/categories";
import { TUNISIAN_CITIES } from "@/lib/data/cities";
import { pageContext, pick } from "@/lib/i18n/page";
import { DashShell, studioContext, studioNav } from "@/lib/studio";

export const metadata: Metadata = { title: "Profile" };

type Contact = { channel: string; value: string; public: boolean };

export default async function StudioProfile({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const { artist, db, badges } = await studioContext(locale);
  const [{ data: loc }, { data: cats }] = await Promise.all([
    db.from("locations").select("*").eq("artist_id", artist.id).maybeSingle(),
    db.from("artist_categories").select("category_slug").eq("artist_id", artist.id),
  ]);
  const chosen = new Set((cats ?? []).map((c) => c.category_slug));
  const contacts = (artist.contact as Contact[]) ?? [];
  const contact = (ch: string) => contacts.find((c) => c.channel === ch);

  return (
    <DashShell title={pick(locale, { en: "My studio", fr: "Mon atelier", ar: "مرسمي" })} items={studioNav(locale, badges)} active={`/${locale}/studio/profile`}>
      {sp.saved && <Notice>{pick(locale, { en: "Profile saved.", fr: "Profil enregistré.", ar: "تم حفظ الملف." })}</Notice>}
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <form action={updateProfileAction} className="space-y-8">
        <input type="hidden" name="locale" value={locale} />
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Profile</h2>
          <Field label="Artist or studio name" name="displayName" defaultValue={artist.display_name} required />
          <TextArea label="Biography" name="bio" rows={6} defaultValue={artist.bio} maxLength={2000} hint="What you make, how, and what makes it yours. At least 80 characters helps customers trust you." />
          <Field label="Specialties (comma separated)" name="specialties" defaultValue={(artist.specialties ?? []).join(", ")} hint="e.g. hand-painted ceramics, glazed tiles" />
          <Select label="Main discipline" name="primary" defaultValue={artist.primary_category} options={CATEGORIES.map((c) => ({ value: c.slug, label: c.name[locale] }))} />
          <fieldset>
            <legend className="text-sm font-medium">Other disciplines (up to 3)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <label key={c.slug} className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm has-[:checked]:border-orange">
                  <input type="checkbox" name="categories" value={c.slug} defaultChecked={chosen.has(c.slug)} className="accent-[#F28C28]" /> {c.name[locale]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Availability" name="availability" defaultValue={artist.availability} options={[{ value: "accepting", label: "Accepting new work" }, { value: "limited", label: "Limited availability" }, { value: "not_accepting", label: "Not accepting new work" }]} />
            <label className="flex items-center gap-3 self-end rounded-xl border border-line bg-white px-4 py-3 text-sm">
              <input type="checkbox" name="commissions" defaultChecked={artist.accepts_commissions} className="accent-[#F28C28]" /> I accept custom requests
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl">Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="City" name="city" defaultValue={loc?.city ?? undefined} options={TUNISIAN_CITIES.map((c) => ({ value: c.name, label: c.name }))} required />
            <Select
              label="What customers see"
              name="privacy"
              defaultValue={loc?.privacy ?? "approximate_city"}
              options={[
                { value: "approximate_city", label: "City only (recommended)" },
                { value: "public_workshop", label: "My public workshop point" },
                { value: "service_area", label: "The area I work in" },
                { value: "hidden", label: "Hidden (no map marker)" },
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Workshop latitude (only for public workshop)" name="lat" type="number" step="0.0001" defaultValue={loc?.privacy === "public_workshop" ? loc.lat : undefined} />
            <Field label="Workshop longitude" name="lng" type="number" step="0.0001" defaultValue={loc?.privacy === "public_workshop" ? loc.lng : undefined} />
            <Field label="Service radius (km)" name="radius" type="number" min={1} max={500} defaultValue={loc?.service_radius_km ?? undefined} />
          </div>
          <p className="text-xs text-muted">Never enter a home address. Only a public workshop should be shown precisely.</p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl">Contact</h2>
          <p className="text-sm text-muted">Contact details stay private unless you tick “Show publicly”.</p>
          {(["email", "phone", "whatsapp", "instagram", "website"] as const).map((ch) => (
            <div key={ch} className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
              <Field label={ch[0].toUpperCase() + ch.slice(1)} name={`contact_${ch}`} defaultValue={contact(ch)?.value} />
              <label className="flex items-center gap-2 pb-3 text-sm">
                <input type="checkbox" name={`public_${ch}`} defaultChecked={contact(ch)?.public} className="accent-[#F28C28]" /> Show publicly
              </label>
            </div>
          ))}
        </section>
        <Submit>Save profile</Submit>
      </form>
    </DashShell>
  );
}
