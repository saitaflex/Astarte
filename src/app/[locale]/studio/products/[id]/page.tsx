import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { deleteImageAction, deleteProductAction, saveProductAction } from "@/app/actions/studio";
import { Notice } from "@/components/dashboard/DashShell";
import { ImageUploader } from "@/components/studio/ImageUploader";
import { StatusPill } from "@/components/ui/StatusPill";
import { Field, Select, Submit, TextArea } from "@/components/ui/form";
import { CATEGORIES } from "@/lib/data/categories";
import { pageContext, pick } from "@/lib/i18n/page";
import { DashShell, studioContext, studioNav } from "@/lib/studio";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit work" };

const AUTH_LABEL: Record<string, string> = {
  human_evidence: "Human evidence",
  ai_indicators: "AI indicators found",
  uncertain: "Origin not determined",
  not_assessed: "Not assessed",
};

export default async function ProductEditor({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const { artist, db, badges } = await studioContext(locale);
  const isNew = id === "new";

  let product: Record<string, unknown> | null = null;
  let cats = new Set<string>();
  let images: { id: string; moderation_status: string; authenticity_state: string; url: string | null }[] = [];
  if (!isNew) {
    const { data } = await db.from("products").select("*, product_categories(category_slug)").eq("id", id).eq("artist_id", artist.id).maybeSingle();
    if (!data) notFound();
    product = data;
    cats = new Set((data.product_categories ?? []).map((c: { category_slug: string }) => c.category_slug));
    const { data: imgs } = await db.from("portfolio_images").select("id, web_path, moderation_status, authenticity_state").eq("product_id", id).order("created_at");
    // Private review copies are shown with short-lived signed URLs.
    const paths = (imgs ?? []).map((i) => i.web_path).filter(Boolean) as string[];
    const signed = paths.length ? (await supabaseAdmin().storage.from("originals").createSignedUrls(paths, 600)).data ?? [] : [];
    images = (imgs ?? []).map((i) => ({ ...i, url: signed.find((s) => s.path === i.web_path)?.signedUrl ?? null }));
  }
  const v = (k: string) => (product?.[k] as string | number | null | undefined) ?? undefined;
  const delivery = new Set((product?.delivery_options as string[]) ?? ["pickup"]);

  return (
    <DashShell title={pick(locale, { en: "My studio", fr: "Mon atelier", ar: "مرسمي" })} items={studioNav(locale, badges)} active={`/${locale}/studio/products`}>
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <h1 className="font-display text-3xl">{isNew ? "New work" : String(v("title"))}</h1>

      <form action={saveProductAction} className="mt-6 space-y-5">
        <input type="hidden" name="locale" value={locale} />
        {!isNew && <input type="hidden" name="id" value={id} />}
        <Field label="Title" name="title" required defaultValue={v("title")} hint="What it is + main material, e.g. “Hand-painted ceramic bowl”." />
        <TextArea label="Description" name="description" rows={6} defaultValue={v("description") as string} maxLength={4000} hint="How it is made, size, materials, care." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (TND)" name="price" type="number" min={0} step="0.01" defaultValue={v("price_amount")} hint="Leave empty for “price on request”." />
          <Select label="Availability" name="availability" defaultValue={(v("availability") as string) ?? "in_stock"} options={[{ value: "in_stock", label: "Available now" }, { value: "made_to_order", label: "Made to order" }, { value: "unavailable", label: "Unavailable" }]} />
          <Field label="Stock" name="stock" type="number" min={0} defaultValue={v("stock")} hint="Empty = not tracked." />
        </div>
        <Field label="Materials (comma separated)" name="materials" defaultValue={((product?.materials as string[]) ?? []).join(", ")} />
        <fieldset>
          <legend className="text-sm font-medium">Categories (1–3)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label key={c.slug} className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm has-[:checked]:border-orange">
                <input type="checkbox" name="categories" value={c.slug} defaultChecked={isNew ? c.slug === artist.primary_category : cats.has(c.slug)} className="accent-[#F28C28]" /> {c.name[locale]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">How customers can receive it</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            {[["pickup", "Pickup at workshop"], ["local_delivery", "Local delivery"], ["shipping", "Shipping"]].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2"><input type="checkbox" name="delivery" value={val} defaultChecked={delivery.has(val)} className="accent-[#F28C28]" /> {label}</label>
            ))}
          </div>
        </fieldset>
        <Field label="Delivery note (optional)" name="deliveryNote" defaultValue={v("delivery_note")} />
        <fieldset className="space-y-4 rounded-[var(--radius-card)] border border-orange/40 bg-orange/5 p-4">
          <legend className="px-1 text-sm font-medium">Savoir-faire passport (optional; shown publicly with a QR code)</legend>
          <p className="text-xs text-muted">Only declare what is true. Empty fields appear as “not provided”, never guessed.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Technique" name="technique" defaultValue={v("technique")} placeholder="e.g. hand-set stone tesserae" />
            <Field label="Made in (city)" name="originCity" defaultValue={v("origin_city")} />
            <Field label="Time to make (hours)" name="hoursToMake" type="number" min={0} step="0.5" defaultValue={v("hours_to_make")} />
            <Field label="Care & repair" name="care" defaultValue={v("care_instructions")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[["localMaterials", "local_materials", "Materials from Tunisia"], ["recycledMaterials", "recycled_materials", "Recycled / reused materials"], ["repairable", "repairable", "I offer repair"]].map(([name, col, label]) => (
              <Select key={name} label={label} name={name} defaultValue={product?.[col] == null ? "unknown" : product[col] ? "yes" : "no"} options={[{ value: "unknown", label: "Not declared" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
            ))}
          </div>
        </fieldset>
        <Select label="Status" name="status" defaultValue={(v("status") as string) ?? "published"} options={[{ value: "published", label: "Published (visible once your profile is approved)" }, { value: "draft", label: "Draft (only you)" }, { value: "archived", label: "Archived" }]} />
        <Submit>{isNew ? "Create work" : "Save changes"}</Submit>
      </form>

      {!isNew && (
        <>
          <section className="mt-12">
            <h2 className="font-display text-2xl">Photos</h2>
            <p className="mt-1 text-sm text-muted">Photos appear publicly after review. Review checks the photo is appropriate; it does not prove how a work was made.</p>
            <div className="mt-4"><ImageUploader locale={locale} productId={id} /></div>
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {images.map((img) => (
                <li key={img.id} className="rounded-[var(--radius-card)] border border-line bg-white p-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-cream-deep">
                    {img.url && <Image src={img.url} alt="" fill sizes="200px" className="object-cover" unoptimized />}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <StatusPill status={img.moderation_status} />
                    <span className="text-muted">{AUTH_LABEL[img.authenticity_state]}</span>
                  </div>
                  <form action={deleteImageAction} className="mt-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="back" value={`/${locale}/studio/products/${id}`} />
                    <button className="text-xs text-muted underline">Delete</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
          <form action={deleteProductAction} className="mt-12 border-t border-line pt-6">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={id} />
            <Submit variant="ghost">Delete this work</Submit>
          </form>
        </>
      )}
    </DashShell>
  );
}
