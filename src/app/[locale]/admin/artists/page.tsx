import type { Metadata } from "next";
import Link from "next/link";
import { decideArtistAction, setVerificationAction } from "@/app/actions/admin";
import { DashShell } from "@/components/dashboard/DashShell";
import { StatusPill } from "@/components/ui/StatusPill";
import { adminContext, adminNav } from "@/lib/admin";
import { categoryName } from "@/lib/data/categories";
import { pageContext } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Artists · Admin" };

export default async function AdminArtists({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }> }) {
  const { locale } = await pageContext(params);
  const { status = "pending" } = await searchParams;
  const { db, badges } = await adminContext(locale);
  let q = db.from("artist_profiles").select("*, locations(city, privacy), products(count), portfolio_images(count)").order("created_at", { ascending: false });
  if (status !== "all") q = q.eq("approval_status", status);
  const { data: artists } = await q;
  const here = `/${locale}/admin/artists?status=${status}`;

  return (
    <DashShell title="Administration" items={adminNav(locale, badges)} active={`/${locale}/admin/artists`}>
      <h1 className="font-display text-3xl">Artist registrations</h1>
      <nav className="mt-4 flex gap-2 text-sm">
        {["pending", "changes_requested", "approved", "rejected", "all"].map((s) => (
          <Link key={s} href={`/${locale}/admin/artists?status=${s}`} className={`rounded-full px-3 py-1.5 ${s === status ? "bg-charcoal text-cream" : "border border-line bg-white"}`}>{s.replace("_", " ")}</Link>
        ))}
      </nav>
      <ul className="mt-6 space-y-4">
        {(artists ?? []).length === 0 && <li className="text-muted">Nothing here.</li>}
        {(artists ?? []).map((a) => (
          <li key={a.id} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl">{a.display_name} {a.is_demo && <span className="ms-2 rounded bg-cream-deep px-1.5 text-xs font-sans">demo</span>}</p>
                <p className="text-sm text-muted">{categoryName(a.primary_category, locale)} · {a.locations?.city ?? "no city"} · {a.products?.[0]?.count ?? 0} works · {a.portfolio_images?.[0]?.count ?? 0} photos · joined {new Date(a.created_at).toLocaleDateString(locale)}</p>
              </div>
              <div className="flex gap-2"><StatusPill status={a.approval_status} /><StatusPill status={a.verification_status} /></div>
            </div>
            <p className="mt-3 text-sm text-charcoal/85">{a.bio || <span className="text-muted">No biography yet.</span>}</p>
            <form action={decideArtistAction} className="mt-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="artistId" value={a.id} />
              <input type="hidden" name="back" value={here} />
              <input name="note" placeholder="Internal note (not shown to the artist)" className="min-w-60 flex-1 rounded-xl border border-line px-3 py-2 text-sm" />
              <button name="decision" value="approved" className="rounded-full bg-charcoal px-4 py-2 text-sm text-cream">Approve</button>
              <button name="decision" value="changes_requested" className="rounded-full border border-line bg-white px-4 py-2 text-sm">Request changes</button>
              <button name="decision" value="rejected" className="rounded-full border border-line bg-white px-4 py-2 text-sm">Reject</button>
            </form>
            <form action={setVerificationAction} className="mt-2 flex gap-2 text-sm">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="artistId" value={a.id} />
              <input type="hidden" name="back" value={here} />
              {a.verification_status !== "verified" ? (
                <button name="status" value="verified" className="text-orange-ink underline">Mark identity verified</button>
              ) : (
                <button name="status" value="not_requested" className="text-muted underline">Remove verification</button>
              )}
            </form>
          </li>
        ))}
      </ul>
    </DashShell>
  );
}
