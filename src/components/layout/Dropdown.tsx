"use client";

import { useEffect, useRef } from "react";

/**
 * Accessible disclosure menu built on <details>. Closes on outside click, on Escape
 * and after choosing an item, so it never stays open over the page.
 */
export function Dropdown({ label, ariaLabel, children, summaryClassName, panelClassName }: { label: React.ReactNode; ariaLabel?: string; children: React.ReactNode; summaryClassName?: string; panelClassName?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) el.open = false;
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary aria-label={ariaLabel} className={`cursor-pointer list-none [&::-webkit-details-marker]:hidden ${summaryClassName ?? ""}`}>
        {label}
      </summary>
      <div
        className={`absolute end-0 z-50 mt-2 rounded-xl border border-line bg-white p-1 shadow-lg ${panelClassName ?? "w-44"}`}
        onClick={(e) => {
          // close after following a link (forms close via navigation)
          if ((e.target as HTMLElement).closest("a")) ref.current?.removeAttribute("open");
        }}
      >
        {children}
      </div>
    </details>
  );
}
