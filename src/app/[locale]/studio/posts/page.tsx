import type { Metadata } from "next";
import { createPostAction, deletePostAction } from "@/app/actions/studio";
import { Notice } from "@/components/dashboard/DashShell";
import { Field, Select, Submit, TextArea } from "@/components/ui/form";
import { pageContext, pick } from "@/lib/i18n/page";
import { DashShell, studioContext, studioNav } from "@/lib/studio";

export const metadata: Metadata = { title: "Stories" };

export default async function StudioPosts({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const { artist, db, badges } = await studioContext(locale);
  const { data: posts } = await db.from("artist_posts").select("*").eq("artist_id", artist.id).order("created_at", { ascending: false });

  return (
    <DashShell title={pick(locale, { en: "My studio", fr: "Mon atelier", ar: "مرسمي" })} items={studioNav(locale, badges)} active={`/${locale}/studio/posts`}>
      {sp.saved && <Notice>Story published.</Notice>}
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <h1 className="font-display text-3xl">Stories</h1>
      <p className="mt-1 text-sm text-muted">Share your journey, a technique or what you are making next. Customers who read your stories can earn Point Merci, which brings you more readers.</p>
      <form action={createPostAction} className="mt-6 space-y-4 rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
        <input type="hidden" name="locale" value={locale} />
        <Field label="Title" name="title" required />
        <Select label="Topic" name="kind" defaultValue="journey" options={[
          { value: "journey", label: "My creative journey" }, { value: "technique", label: "A technique" }, { value: "product", label: "A work" },
          { value: "workshop", label: "A workshop" }, { value: "inspiration", label: "An inspiration" }, { value: "upcoming", label: "What's coming next" },
        ]} />
        <TextArea label="Story" name="body" rows={7} required maxLength={6000} hint="5–10 sentences is ideal. At least 40 characters." />
        <Submit>Publish story</Submit>
      </form>
      <ul className="mt-8 space-y-3">
        {(posts ?? []).map((p) => (
          <li key={p.id} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{p.kind} · {new Date(p.created_at).toLocaleDateString(locale)}</p>
            <h2 className="mt-1 font-display text-xl">{p.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm text-charcoal/80">{p.body}</p>
            <form action={deletePostAction} className="mt-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={p.id} />
              <button className="text-xs text-muted underline">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </DashShell>
  );
}
