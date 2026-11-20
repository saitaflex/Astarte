import type { Metadata } from "next";
import { pageContext } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Terms" };

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  await pageContext(params);
  const items = [
    ["The service", "Astarte helps people discover artists and artisans. Agreements on price, delivery and payment are made directly between customers and artists."],
    ["Artists' work", "Artists keep all rights to their work. By uploading, an artist confirms the work is their own and allows Astarte to display it."],
    ["AI-generated content", "Portfolios must show human-made work. Images may be reviewed; automated assessments are never the only basis for a decision, and artists can ask for a review."],
    ["Conduct", "No impersonation, fraud or harassment. Reported content is reviewed by our team."],
    ["Demo status", "This is an MVP demonstration. Features and terms may change."],
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-4xl">Terms</h1>
      <dl className="mt-10 space-y-8">
        {items.map(([t, d]) => (
          <div key={t}>
            <dt className="font-display text-xl">{t}</dt>
            <dd className="mt-1 text-muted">{d}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
