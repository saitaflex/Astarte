"use client";

import { useActionState } from "react";
import { askGuideAction, type GuideAnswer } from "@/app/actions/grow";
import { Orb } from "@/components/orb/Orb";
import { Submit } from "@/components/ui/form";

export function GuideAssistant({ locale, examples }: { locale: string; examples: string[] }) {
  const [state, action, pending] = useActionState<GuideAnswer, FormData>(askGuideAction, { findings: [], advice: null });
  return (
    <div className="rounded-[22px] border border-line bg-white/80 p-6">
      <div className="flex items-center gap-4">
        <Orb state={pending ? "thinking" : state.advice ? "results" : "idle"} className="w-16 shrink-0" />
        <div>
          <h3 className="font-display text-2xl">Guide</h3>
          <p className="text-sm text-muted">Practical help based on your real listings. It never invents numbers or promises sales.</p>
        </div>
      </div>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <textarea name="question" rows={3} required maxLength={800} placeholder={examples[0]} className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-orange" />
        <div className="flex flex-wrap items-center gap-2">
          <Submit>Ask</Submit>
          {examples.slice(1).map((e) => <span key={e} className="text-xs text-muted">“{e}”</span>)}
        </div>
      </form>
      {state.error && <p role="alert" className="mt-4 text-sm">{state.error}</p>}
      {state.findings.length > 0 && (
        <div className="mt-5 space-y-4" aria-live="polite">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-orange-ink">What we see in your listings</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {state.findings.map((f) => <li key={f} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" aria-hidden="true" />{f}</li>)}
            </ul>
          </div>
          {state.advice && (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-orange-ink">Suggested next steps</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{state.advice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
