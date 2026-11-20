"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Orb, type OrbState } from "@/components/orb/Orb";
import type { DiscoveryResponse } from "@/lib/discovery/types";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ResultCardView } from "./ResultCardView";

type Status = "idle" | "loading" | "done" | "error";

export function DiscoveryPanel({ locale, t }: { locale: Locale; t: Pick<Dictionary, "hero" | "results" | "nav"> }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<DiscoveryResponse | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const orbState: OrbState =
    status === "loading" ? "thinking" : status === "error" ? "error" : status === "done" && !focused ? "results" : focused && query ? "typing" : "idle";

  async function run(text: string) {
    const q = text.trim();
    if (q.length < 2 || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as DiscoveryResponse);
      setStatus("done");
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch {
      setStatus("error");
    }
  }

  const count = data?.results.length ?? 0;
  const announce =
    status === "loading" ? t.results.searching : status === "error" ? t.results.error : status === "done" ? (count === 0 ? t.results.none : count === 1 ? t.results.foundOne : t.results.foundMany.replace("{n}", String(count))) : "";

  return (
    <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 pt-6 text-center sm:pt-10">
      <Orb state={orbState} className="-mb-10 w-[min(78vw,440px)] sm:-mb-14" />

      <h1 className="fade-up font-display text-[clamp(2.1rem,5.4vw,3.9rem)] leading-[1.05] tracking-[-0.02em] text-charcoal">{t.hero.title}</h1>
      <p className="fade-up mt-4 max-w-xl text-balance text-base text-muted sm:text-lg" style={{ animationDelay: "80ms" }}>
        {t.hero.subtitle}
      </p>

      <form
        className="fade-up mt-8 w-full"
        style={{ animationDelay: "160ms" }}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
      >
        <label htmlFor="discover-input" className="sr-only">
          {t.hero.placeholder}
        </label>
        <div className={`flex items-center gap-2 rounded-full border bg-white p-1.5 ps-5 shadow-[0_10px_40px_-12px_rgba(242,140,40,.35)] transition ${focused ? "border-orange" : "border-line"}`}>
          <input
            id="discover-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t.hero.placeholder}
            maxLength={500}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-3 text-base text-charcoal placeholder:text-muted/80 focus:outline-none sm:text-lg"
          />
          <button
            type="submit"
            disabled={status === "loading" || query.trim().length < 2}
            className="grid h-12 min-w-12 place-items-center rounded-full bg-orange px-5 font-medium text-charcoal transition hover:bg-orange-soft disabled:opacity-50"
          >
            <span className="sr-only sm:not-sr-only">{t.hero.submit}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 sm:hidden rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>

      {status === "idle" && (
        <div className="fade-up mt-4 flex flex-wrap justify-center gap-2" style={{ animationDelay: "240ms" }}>
          {t.hero.examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                run(ex);
              }}
              className="rounded-full border border-line bg-white/60 px-3.5 py-1.5 text-sm text-muted transition hover:border-orange/60 hover:text-charcoal"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div ref={resultsRef} className="mt-8 w-full text-start">
        {status === "done" && data && (
          <div className="fade-up space-y-3">
            {data.ai !== "on" && <p className="text-xs text-muted">{t.results.aiOffline}</p>}
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm font-medium text-charcoal">{announce}</p>
            </div>
            {data.explanation?.intro && count > 0 && <p className="text-[15px] leading-relaxed text-charcoal/90">{data.explanation.intro}</p>}
            {count === 0 && <p className="text-sm text-muted">{t.results.noneHint}</p>}
            <div className="grid gap-3">
              {data.results.map((card) => (
                <ResultCardView key={`${card.kind}-${card.id}`} card={card} reason={data.explanation?.reasons[card.id]} locale={locale} t={t.results} />
              ))}
            </div>
            {data.explanation?.question && (
              <p className="rounded-[var(--radius-card)] border border-dashed border-orange/50 bg-white/60 p-4 text-sm text-charcoal">{data.explanation.question}</p>
            )}
          </div>
        )}
        {status === "error" && <p className="text-center text-sm text-muted">{t.results.error}</p>}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm">
        <Link href={`/${locale}/artists`} className="font-medium text-charcoal underline decoration-orange decoration-2 underline-offset-[6px] hover:decoration-orange-soft">
          {t.hero.exploreArtists}
        </Link>
        <Link href={`/${locale}/join`} className="text-muted hover:text-charcoal">
          {t.hero.becomeArtist}
        </Link>
      </div>
    </section>
  );
}
