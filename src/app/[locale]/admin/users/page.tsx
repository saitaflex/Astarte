import type { Metadata } from "next";
import { setUserStatusAction } from "@/app/actions/admin";
import { DashShell, Notice } from "@/components/dashboard/DashShell";
import { StatusPill } from "@/components/ui/StatusPill";
import { adminContext, adminNav } from "@/lib/admin";
import { pageContext } from "@/lib/i18n/page";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Users · Admin" };

export default async function AdminUsers({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string; role?: string }> }) {
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const { db, badges } = await adminContext(locale);
  let q = db.from("profiles").select("id, role, display_name, status, created_at").order("created_at", { ascending: false }).limit(200);
  if (sp.role) q = q.eq("role", sp.role);
  const { data: profiles } = await q;
  // Emails come from the auth service. Passwords and tokens are never readable.
  const { data: auth } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailOf = new Map((auth?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const here = `/${locale}/admin/users${sp.role ? `?role=${sp.role}` : ""}`;

  return (
    <DashShell title="Administration" items={adminNav(locale, badges)} active={`/${locale}/admin/users`}>
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <h1 className="font-display text-3xl">Users</h1>
      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white/80">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-muted">
            <tr className="border-b border-line"><th className="px-4 py-3 text-start">Name</th><th className="px-4 py-3 text-start">Email</th><th className="px-4 py-3 text-start">Role</th><th className="px-4 py-3 text-start">Status</th><th className="px-4 py-3 text-start">Action</th></tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{p.display_name || "—"}</td>
                <td className="px-4 py-3">{emailOf.get(p.id)}</td>
                <td className="px-4 py-3">{p.role}</td>
                <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                <td className="px-4 py-3">
                  {p.role !== "admin" && (
                    <form action={setUserStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="userId" value={p.id} />
                      <input type="hidden" name="back" value={here} />
                      {p.status === "active" ? (
                        <>
                          <input name="reason" placeholder="Reason" className="w-36 rounded-lg border border-line px-2 py-1 text-xs" />
                          <button name="status" value="suspended" className="text-xs underline">Suspend</button>
                        </>
                      ) : (
                        <button name="status" value="active" className="text-xs underline">Restore</button>
                      )}
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashShell>
  );
}
