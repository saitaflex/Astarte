"use client";

import { useFormStatus } from "react-dom";

export function Field({
  label,
  name,
  type = "text",
  required,
  hint,
  defaultValue,
  autoComplete,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  hint?: string;
  defaultValue?: string | number;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-charcoal">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base outline-none transition focus:border-orange"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, name, rows = 4, required, defaultValue, hint, maxLength }: { label: string; name: string; rows?: number; required?: boolean; defaultValue?: string; hint?: string; maxLength?: number }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-charcoal">{label}</span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base outline-none transition focus:border-orange"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Select({ label, name, options, defaultValue, required }: { label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-charcoal">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} required={required} className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-orange">
        {!defaultValue && <option value="" disabled>—</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Submit({ children, variant = "primary", className = "" }: { children: React.ReactNode; variant?: "primary" | "dark" | "ghost"; className?: string }) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-orange text-charcoal hover:bg-orange-soft",
    dark: "bg-charcoal text-cream hover:bg-charcoal/85",
    ghost: "border border-line bg-white text-charcoal hover:border-charcoal/30",
  }[variant];
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`rounded-full px-5 py-3 font-medium transition disabled:opacity-60 ${styles} ${className}`}>
      {pending ? "…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-charcoal">
      {message}
    </p>
  );
}
