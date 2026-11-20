import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatMoney } from "@/lib/format";
import { pageContext, pick } from "@/lib/i18n/page";
import { DashShell, studioContext, studioNav } from "@/lib/studio";

export const metadata: Metadata = { title: "Works" };

export default async function StudioProducts({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await pageContext(params);
  const { artist, db, badges } = await studioContext(locale);
  const [{ data: products }, { data: images }] = await Promise.all([
    db.from("products").select("id, title, status, price_amount, currency, stock, availability, views").eq("artist_id", artist.id).order("created_at", { ascending: false }),
    db.from("portfolio_images").select("product_id, moderation_status").eq("artist_id", artist.id),
  ]);
  const imgCount = (id: string, status?: string) => (images ?? []).filter((i) => i.product_id === id && (!status || i.moderation_status === status)).length;

  return (
    <DashShell title={pick(locale, { en: "My studio", fr: "Mon atelier", ar: "مرسمي" })} items={studioNav(locale, badges)} active={`/${locale}/studio/products`}>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl">{pick(locale, { en: "Works & photos", fr: "Œuvres & photos", ar: "الأعمال والصور" })}</h1>
        <Link href={`/${locale}/studio/products/new`} className="rounded-full bg-orange px-5 py-2.5 text-sm font-medium">+ {pick(locale, { en: "New work", fr: "Nouvelle œuvre", ar: "عمل جديد" })}</Link>
      </div>
      {(products ?? []).length === 0 ? (
        <p className="mt-10 text-muted">{pick(locale, { en: "No works yet. Add your first one: a clear title, a photo and a price are enough to start.", fr: "Aucune œuvre. Ajoutez la première : un titre clair, une photo et un prix suffisent.", ar: "لا توجد أعمال بعد. أضف أول عمل: عنوان واضح وصورة وسعر تكفي للبدء." })}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white/80">
          <table className="w-full text-sm">
            <thead className="text-start text-xs uppercase tracking-[0.12em] text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-start">Work</th><th className="px-4 py-3 text-start">Status</th><th className="px-4 py-3 text-start">Price</th>
                <th className="px-4 py-3 text-start">Stock</th><th className="px-4 py-3 text-start">Photos</th><th className="px-4 py-3 text-start">Views</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3"><Link href={`/${locale}/studio/products/${p.id}`} className="font-medium hover:text-orange-ink">{p.title}</Link></td>
                  <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                  <td className="px-4 py-3">{p.price_amount != null ? formatMoney({ amount: Number(p.price_amount), currency: p.currency }, locale) : "On request"}</td>
                  <td className="px-4 py-3">{p.stock ?? "—"}</td>
                  <td className="px-4 py-3">{imgCount(p.id, "approved")} approved{imgCount(p.id, "pending") ? ` · ${imgCount(p.id, "pending")} in review` : ""}</td>
                  <td className="px-4 py-3">{p.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashShell>
  );
}
