"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-charcoal px-4 py-2 text-sm text-cream">
      {label}
    </button>
  );
}
