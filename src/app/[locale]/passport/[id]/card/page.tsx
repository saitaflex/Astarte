import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/passport/PrintButton";
import { getCatalog } from "@/lib/data/repository";
import { pageContext } from "@/lib/i18n/page";
import { passportLabels, passportUrl, qrSvg } from "@/lib/passport";

export const metadata: Metadata = { title: "QR card" };

/** Printable tag to attach to the physical object: QR to its passport, title, maker. */
export default async function PassportCard({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const { locale } = await pageContext(params);
  const { products, artists } = await getCatalog();
  const p = products.find((x) => x.id === id);
  const artist = p && artists.find((a) => a.id === p.artistId);
  if (!p || !artist) notFound();
  const l = passportLabels(locale);
  const qr = await qrSvg(passportUrl(locale, p.id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted">{l.print}: A6 / 10 × 15 cm</p>
        <PrintButton label={l.print} />
      </div>
      <div className="mx-auto flex w-[10cm] flex-col items-center rounded-2xl border-2 border-charcoal bg-white p-6 text-center print:border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark.png" alt="Astarte" className="h-16 w-auto" />
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-ink">{l.title}</p>
        <div className="mt-3 h-44 w-44" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={l.scan} />
        <p className="mt-3 font-display text-lg leading-tight">{p.title}</p>
        <p className="text-sm text-muted">{l.maker} {artist.displayName}</p>
        <p className="mt-2 text-[10px] text-muted">{l.scan}</p>
      </div>
    </div>
  );
}
