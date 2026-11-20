import type { Metadata } from "next";
import { DashShell } from "@/components/dashboard/DashShell";
import { adminContext, adminNav } from "@/lib/admin";
import { pageContext } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Audit log · Admin" };

export default async function AdminAudit({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await pageContext(params);
  const { db, badges } = await adminContext(locale);
  const { data: logs } = await db.from("audit_logs").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(200);

  return (
    <DashShell title="Administration" items={adminNav(locale, badges)} active={`/${locale}/admin/audit`}>
      <h1 className="font-display text-3xl">Audit log</h1>
      <p className="mt-1 text-sm text-muted">Every administrative decision, newest first. Entries cannot be edited from the app.</p>
      <ul className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white/80 font-mono text-xs">
        {(logs ?? []).map((l) => (
          <li key={l.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[170px_160px_1fr]">
            <span className="text-muted">{new Date(l.created_at).toLocaleString(locale)}</span>
            <span>{l.action}</span>
            <span className="break-all text-muted">{l.target_type}:{String(l.target_id).slice(0, 8)} {Object.keys(l.details ?? {}).length ? JSON.stringify(l.details) : ""}</span>
          </li>
        ))}
        {(logs ?? []).length === 0 && <li className="px-4 py-3 font-sans text-muted">No entries yet.</li>}
      </ul>
    </DashShell>
  );
}
