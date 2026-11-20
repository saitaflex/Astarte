import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { discover } from "@/lib/discovery/pipeline";
import { isLocale } from "@/lib/i18n/config";
import { logSearch } from "@/lib/recommend";
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
    // Demand signal for creators: which real searches surfaced them (query text only, no visitor data).
    logSearch(parsed.data.query, parsed.data.locale,
      result.results.filter((r) => r.kind === "artist").map((r) => r.id),
      result.results.filter((r) => r.kind === "product").map((r) => r.id)).catch(() => undefined);
    return NextResponse.json(result);
  } catch (err) {
    console.error("discover failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
