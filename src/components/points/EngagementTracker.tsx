"use client";

import { useEffect, useRef, useState } from "react";
import { completeEngagement, startEngagement } from "@/app/actions/points";

/**
 * Rewards genuine discovery: starts a server-timed session, waits while the tab is
 * visible, then asks the server to complete it. The server re-checks the time,
 * daily limits and duplicates, so nothing here can mint points on its own.
 */
export function EngagementTracker({
  activity,
  targetId,
  seconds,
  enabled,
  template,
}: {
  activity: "profile_discovery" | "post_read";
  targetId: string;
  seconds: number;
  enabled: boolean;
  /** e.g. "+{n} Point Merci" */
  template: string;
}) {
  const [earned, setEarned] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    let visibleMs = 0;
    let last = Date.now();
    let timer: number | undefined;
    let sessionId: string | undefined;
    let cancelled = false;

    startEngagement(activity, targetId).then((res) => {
      if (cancelled || !res.sessionId) return;
      sessionId = res.sessionId;
      timer = window.setInterval(async () => {
        const now = Date.now();
        if (document.visibilityState === "visible") visibleMs += now - last;
        last = now;
        if (visibleMs >= (seconds + 1) * 1000 && sessionId) {
          window.clearInterval(timer);
          const done = await completeEngagement(sessionId);
          if (!cancelled && done.points > 0) setEarned(done.points);
        }
      }, 1000);
    });
    return () => {
      cancelled = true;
      started.current = false;
      if (timer) window.clearInterval(timer);
    };
  }, [activity, targetId, seconds, enabled]);

  if (!earned) return null;
  return (
    <div role="status" className="fade-up fixed bottom-6 start-1/2 z-50 -translate-x-1/2 rounded-full bg-charcoal px-5 py-3 text-sm text-cream shadow-xl rtl:translate-x-1/2">
      <span className="me-2 inline-block h-2 w-2 rounded-full bg-orange align-middle" aria-hidden="true" />
      {template.replace("{n}", String(earned))}
    </div>
  );
}
