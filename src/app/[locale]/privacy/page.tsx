import type { Metadata } from "next";
import { pageContext } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Privacy" };

// MVP privacy notice. Mirrors docs/DATA_PROTECTION_PLAN.md; legal review is deferred post-MVP.
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  await pageContext(params);
  const items = [
    ["What we collect", "Account email and name; for artists, the profile, works, events and the location level they choose. Search requests are processed to show results."],
    ["What is public", "Only what an artist publishes: profile, approved images, works, events, and contact details they mark as public. Exact home addresses are never shown."],
    ["AI processing", "Search requests are sent to an AI provider to interpret them and explain results. Phone numbers, emails and addresses are removed first. Only public catalog records are shared."],
    ["Images", "Location data (GPS) is removed from uploaded images. Originals are stored privately."],
    ["Your rights", "You can access, correct or delete your data from your account, or by contacting us."],
    ["Retention", "Deleted accounts are erased after 30 days. AI request logs are kept 90 days."],
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-4xl">Privacy</h1>
      <p className="mt-2 text-sm text-muted">MVP notice · last updated 19 November 2026</p>
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
