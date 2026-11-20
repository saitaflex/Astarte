"use client";

import { useEffect, useState } from "react";

/** Lets visitors promote an artist or a work: native share sheet, WhatsApp, Facebook, X or copy link. */
export function ShareButtons({ title, text, label = "Share" }: { title: string; text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(""); // read after mount to avoid a server/client mismatch
  useEffect(() => setUrl(window.location.href), []);
  const enc = encodeURIComponent;
  const links = [
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { name: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
  ];

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: window.location.href });
        return;
      } catch {
        /* user closed the sheet */
      }
    }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" onClick={share} className="rounded-full border border-line bg-white px-3 py-1.5 hover:border-orange/60">
        {copied ? "Link copied ✓" : `↗ ${label}`}
      </button>
      {links.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className="rounded-full px-2 py-1.5 text-muted hover:text-charcoal">
          {l.name}
        </a>
      ))}
    </div>
  );
}
