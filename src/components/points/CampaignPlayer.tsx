"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { completeEngagement, startEngagement } from "@/app/actions/points";

function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/**
 * Sponsored video with a server-timed session. The counter only runs while the tab
 * is visible; the server re-checks the elapsed time, budget and one-claim-per-person.
 */
export function CampaignPlayer({ campaign, canEarn, alreadyDone }: { campaign: { id: string; title: string; sponsor_name: string; video_url: string; min_seconds: number; points: number }; canEarn: boolean; alreadyDone: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<string | null>(null);
  const [watched, setWatched] = useState(0);
  const [result, setResult] = useState<string | null>(alreadyDone ? "Points already received for this video." : null);
  const tick = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open || !session) return;
    tick.current = window.setInterval(() => {
      if (document.visibilityState === "visible") setWatched((w) => w + 1);
    }, 1000);
    return () => window.clearInterval(tick.current);
  }, [open, session]);

  async function begin() {
    setOpen(true);
    if (!canEarn || alreadyDone) return;
    const res = await startEngagement("sponsored_video", campaign.id);
    if (res.sessionId) setSession(res.sessionId);
    else setResult("This video cannot earn points right now.");
  }

  async function claim() {
    if (!session) return;
    const res = await completeEngagement(session);
    setResult(res.points > 0 ? `+${res.points} Point Merci added.` : res.error ? `Not credited: ${res.error}` : "Points already received.");
    setSession(null);
    router.refresh();
  }

  const embed = embedUrl(campaign.video_url);
  const remaining = Math.max(0, campaign.min_seconds + 1 - watched);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-ink">Sponsored · {campaign.sponsor_name}</p>
      <h3 className="mt-1 font-display text-xl">{campaign.title}</h3>
      <p className="mt-1 text-sm text-muted">Watch for {campaign.min_seconds} s · {campaign.points} points</p>
      {!open ? (
        <button onClick={begin} className="mt-4 rounded-full bg-charcoal px-4 py-2 text-sm text-cream">Watch</button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-charcoal">
            {embed ? (
              <iframe src={embed} title={campaign.title} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            ) : (
              <video src={campaign.video_url} controls className="absolute inset-0 h-full w-full" />
            )}
          </div>
          {session && (
            remaining > 0 ? (
              <p className="text-sm text-muted" aria-live="polite">Keep watching: {remaining} s</p>
            ) : (
              <button onClick={claim} className="rounded-full bg-orange px-4 py-2 text-sm font-medium">Claim {campaign.points} points</button>
            )
          )}
        </div>
      )}
      {!canEarn && <p className="mt-3 text-xs text-muted">Sign in with a customer account to earn points.</p>}
      {result && <p role="status" className="mt-3 text-sm">{result}</p>}
    </div>
  );
}
