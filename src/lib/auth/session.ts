import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export type Role = "customer" | "artist" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  status: "active" | "suspended";
  artistId: string | null;
}

/** Current user with role, read from the database (never from client claims). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const db = await supabaseServer();
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await db.from("profiles").select("role, display_name, status").eq("id", data.user.id).maybeSingle();
  if (!profile) return null;
  let artistId: string | null = null;
  if (profile.role === "artist" || profile.role === "admin") {
    const { data: artist } = await db.from("artist_profiles").select("id").eq("user_id", data.user.id).maybeSingle();
    artistId = artist?.id ?? null;
  }
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    role: profile.role as Role,
    displayName: profile.display_name,
    status: profile.status as SessionUser["status"],
    artistId,
  };
});

/** Server-side guard for pages and actions. Redirects instead of trusting the UI. */
export async function requireRole(locale: string, roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}`)}`);
  if (user.status !== "active") redirect(`/${locale}/sign-in?error=suspended`);
  if (!roles.includes(user.role)) redirect(`/${locale}`);
  return user;
}

/** Writes an audit log entry. Server-only; uses the service role. */
export async function audit(actorId: string, action: string, targetType: string, targetId: string, details: Record<string, unknown> = {}) {
  await supabaseAdmin().from("audit_logs").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, details });
}
