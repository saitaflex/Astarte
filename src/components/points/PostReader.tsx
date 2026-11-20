"use client";

import { useState } from "react";
import type { ArtistPost } from "@/lib/data/types";
import { EngagementTracker } from "./EngagementTracker";

/** An artist story. Opening it starts a reading session; points come only after real reading time. */
export function PostReader({ post, canEarn, template, readLabel, dateLabel }: { post: ArtistPost; canEarn: boolean; template: string; readLabel: string; dateLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{post.kind} · {dateLabel}</p>
      <h3 className="mt-1 font-display text-xl">{post.title}</h3>
      {open ? (
        <p className="mt-3 whitespace-pre-line leading-relaxed text-charcoal/85">{post.body}</p>
      ) : (
        <>
          <p className="mt-2 line-clamp-2 text-sm text-muted">{post.body}</p>
          <button onClick={() => setOpen(true)} className="mt-3 text-sm underline decoration-orange underline-offset-4" aria-expanded={open}>
            {readLabel} →
          </button>
        </>
      )}
      <EngagementTracker activity="post_read" targetId={post.id} seconds={30} enabled={open && canEarn} template={template} />
    </article>
  );
}
