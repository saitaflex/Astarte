import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recordInteraction, VISITOR_COOKIE } from "@/lib/recommend";
import { rateLimit } from "@/lib/security/rate-limit";

const Body = z.object({
  kind: z.enum(["view_product", "view_artist", "contact_click", "recommendation_click"]),
  productId: z.string().uuid().optional(),
  artistId: z.string().uuid().optional(),
  source: z.string().max(40).optional(),
});

/** Anonymous interaction log: a random visitor id in a cookie, no name, email or IP stored. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`events:${ip}`, 120, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.productId && !parsed.data.artistId)) return NextResponse.json({ ok: false }, { status: 400 });

  let visitor = req.cookies.get(VISITOR_COOKIE)?.value;
  const isNew = !visitor || !/^[a-f0-9-]{36}$/.test(visitor);
  if (isNew) visitor = crypto.randomUUID();
  await recordInteraction(visitor!, parsed.data.kind, parsed.data.productId ?? null, parsed.data.artistId ?? null, parsed.data.source ?? null);

  const res = NextResponse.json({ ok: true });
  if (isNew) res.cookies.set(VISITOR_COOKIE, visitor!, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 180 });
  return res;
}
