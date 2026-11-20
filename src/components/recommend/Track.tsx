"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

type Kind = "view_product" | "view_artist" | "contact_click" | "recommendation_click";
interface Ev { kind: Kind; productId?: string; artistId?: string; source?: string }

function send(ev: Ev) {
  const body = JSON.stringify(ev);
  if (navigator.sendBeacon?.(("/api/events"), new Blob([body], { type: "application/json" }))) return;
  fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

/** Logs one anonymous view when the page is shown. */
export function TrackView(ev: Ev) {
  useEffect(() => { send(ev); }, [ev.kind, ev.productId, ev.artistId]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** A link that logs a click (recommendation or contact) before navigating. */
export function TrackLink({ href, ev, className, children }: { href: string; ev: Ev; className?: string; children: ReactNode }) {
  return <Link href={href} className={className} onClick={() => send(ev)}>{children}</Link>;
}
