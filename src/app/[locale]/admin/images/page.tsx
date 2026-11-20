import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { moderateImageAction } from "@/app/actions/admin";
import { DetectorButton } from "@/components/admin/DetectorButton";
import { DashShell } from "@/components/dashboard/DashShell";
import { DETECTOR } from "@/lib/images/detector";
import { StatusPill } from "@/components/ui/StatusPill";
import { adminContext, adminNav } from "@/lib/admin";
import { pageContext } from "@/lib/i18n/page";
import { one } from "@/lib/supabase/rel";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Image review · Admin" };

const STATE: Record<string, { label: string; text: string }> = {
  human_evidence: { label: "Human evidence", text: "Supporting evidence of human creation exists. This is not mathematical proof." },
  ai_indicators: { label: "AI indicators", text: "Signals associated with AI generation were found. This is an assessment, not proof." },
  uncertain: { label: "Uncertain", text: "Not enough evidence either way." },
  not_assessed: { label: "Not assessed", text: "No assessment was run." },
};

type Signals = { hadExif?: boolean; hadGps?: boolean; software?: string | null; aiSoftwareTag?: boolean; c2paMarkerFound?: boolean; cameraMake?: string | null };

export default async function AdminImages({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }> }) {
  const { locale } = await pageContext(params);
  const { status = "pending" } = await searchParams;
  const { db, badges } = await adminContext(locale);
  let q = db
    .from("portfolio_images")
    .select("*, artist_profiles(display_name, slug), products(title), authenticity_assessments(*)")
    .order("created_at", { ascending: true })
    .limit(30);
  if (status !== "all") q = q.eq("moderation_status", status);
  const { data: images } = await q;
  const ids = (images ?? []).map((i) => i.id);
  const { data: reviews } = ids.length ? await db.from("moderation_reviews").select("*").eq("target_type", "portfolio_image").in("target_id", ids).order("created_at", { ascending: false }) : { data: [] };
  const paths = (images ?? []).map((i) => i.web_path).filter(Boolean) as string[];
  const signed = paths.length ? (await supabaseAdmin().storage.from("originals").createSignedUrls(paths, 900)).data ?? [] : [];
  const here = `/${locale}/admin/images?status=${status}`;

  return (
    <DashShell title="Administration" items={adminNav(locale, badges)} active={`/${locale}/admin/images`}>
      <h1 className="font-display text-3xl">Image review</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Approving an image means it is appropriate to publish. It does not prove the work is human-made. Automated signals assist you; never reject or accuse an artist on a score alone. Your decision is stored separately from the automated assessment.
      </p>
      <div className="mt-4">
        <DetectorButton
          label="Run AI detector on every image in this list"
          images={(images ?? []).map((i) => ({ id: i.id, url: signed.find((x) => x.path === i.web_path)?.signedUrl ?? "" })).filter((i) => i.url)}
        />
      </div>
      <nav className="mt-4 flex gap-2 text-sm">
        {["pending", "changes_requested", "approved", "rejected", "all"].map((s) => (
          <Link key={s} href={`/${locale}/admin/images?status=${s}`} className={`rounded-full px-3 py-1.5 ${s === status ? "bg-charcoal text-cream" : "border border-line bg-white"}`}>{s.replace("_", " ")}</Link>
        ))}
      </nav>
      <ul className="mt-6 space-y-6">
        {(images ?? []).length === 0 && <li className="text-muted">The queue is empty.</li>}
        {(images ?? []).map((img) => {
          const all = [...(img.authenticity_assessments ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at));
          const det = all.find((x) => x.provider === DETECTOR.provider);
          const a = all.find((x) => x.provider !== DETECTOR.provider);
          const s = (a?.signals ?? {}) as Signals;
          const url = signed.find((x) => x.path === img.web_path)?.signedUrl;
          const artist = one(img.artist_profiles);
          const product = one(img.products);
          const history = (reviews ?? []).filter((r) => r.target_id === img.id);
          return (
            <li key={img.id} className="grid gap-5 rounded-[var(--radius-card)] border border-line bg-white/80 p-5 md:grid-cols-[280px_1fr]">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-cream-deep">
                {url && <Image src={url} alt="Uploaded image under review" fill sizes="280px" className="object-contain" unoptimized />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-xl">{artist?.display_name}{product ? <span className="text-muted"> · {product.title}</span> : null}</p>
                  <StatusPill status={img.moderation_status} />
                </div>
                <p className="text-xs text-muted">Uploaded {new Date(img.created_at).toLocaleString(locale)} · {img.width}×{img.height} · {(img.size_bytes / 1024).toFixed(0)} KB · {img.mime} · sha256 {img.sha256.slice(0, 12)}…</p>

                <div className="mt-4 rounded-xl border border-line bg-cream/60 p-4 text-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Automated assessment</p>
                  <p className="mt-1 font-medium">{STATE[img.authenticity_state]?.label}</p>
                  <p className="text-muted">{STATE[img.authenticity_state]?.text}</p>
                  <div className="mt-3 rounded-lg bg-white/80 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">AI-image detector</p>
                    {det ? (
                      <>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-deep" role="meter" aria-valuenow={Math.round(Number(det.score) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Model output for artificial">
                            <div className={`h-full ${Number(det.score) >= DETECTOR.threshold ? "bg-orange" : "bg-charcoal/40"}`} style={{ width: `${Math.max(2, Number(det.score) * 100)}%` }} />
                          </div>
                          <span className="w-28 text-end text-xs">{(Number(det.score) * 100).toFixed(1)}% “artificial”</span>
                        </div>
                        <p className="mt-1 text-xs text-muted">Raw model output, not a calibrated probability. Real photos with heavy lighting or filters can score high. Run {new Date(det.created_at).toLocaleString(locale)} · {det.model_id} ({det.model_version})</p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-muted">Not run yet for this image.</p>
                    )}
                    {url && <div className="mt-2"><DetectorButton images={[{ id: img.id, url }]} label={det ? "Run again" : "Run AI detector"} /></div>}
                  </div>
                  {a && (
                    <>
                      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                        <li>EXIF metadata: {s.hadExif ? "present (removed from public copy)" : "none"}</li>
                        <li>GPS location: {s.hadGps ? "present (removed)" : "none"}</li>
                        <li>Camera: {s.cameraMake ?? "not stated"}</li>
                        <li>Software tag: {s.software ?? "none"}</li>
                        <li>AI tool named in file: {s.aiSoftwareTag ? "yes" : "no"}</li>
                        <li>Content Credentials (C2PA) marker: {s.c2paMarkerFound ? "found, not verified" : "none"}</li>
                      </ul>
                      <p className="mt-2 text-xs text-muted">Provider: {a.provider} · model {a.model_id ?? "—"} · version {a.model_version ?? "—"} · score {a.score_calibrated && a.score != null ? a.score : "not shown (uncalibrated)"}</p>
                      {a.note && <p className="mt-1 text-xs text-muted">{a.note}</p>}
                    </>
                  )}
                </div>

                <form action={moderateImageAction} className="mt-4 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="back" value={here} />
                  <input name="note" placeholder="Internal note" className="min-w-52 flex-1 rounded-xl border border-line px-3 py-2 text-sm" />
                  <button name="decision" value="approve" className="rounded-full bg-charcoal px-4 py-2 text-sm text-cream">Approve</button>
                  <button name="decision" value="request_changes" className="rounded-full border border-line bg-white px-4 py-2 text-sm">Request clarification</button>
                  <button name="decision" value="mark_uncertain" className="rounded-full border border-line bg-white px-4 py-2 text-sm">Mark uncertain</button>
                  <button name="decision" value="reject" className="rounded-full border border-line bg-white px-4 py-2 text-sm">Reject</button>
                </form>
                {history.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted">
                    {history.map((h) => <li key={h.id}>{new Date(h.created_at).toLocaleString(locale)} · {h.decision}{h.internal_note ? ` · “${h.internal_note}”` : ""}</li>)}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </DashShell>
  );
}
