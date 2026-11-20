import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { discover } from "@/lib/discovery/pipeline";
import { isLocale } from "@/lib/i18n/config";
import { rateLimit } from "@/lib/security/rate-limit";

const Body = z.object({
  query: z.string().trim().min(2).max(500),
  locale: z.string().refine(isLocale).default("en"),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`discover:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  try {
    const result = await discover(parsed.data.query, parsed.data.locale as "en" | "fr" | "ar");
    return NextResponse.json(result);
  } catch (err) {
    console.error("discover failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
