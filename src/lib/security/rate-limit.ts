/**
 * Small in-memory sliding-window limiter. On serverless each instance has its
 * own memory, so this is a best-effort guard; swap for a shared store
 * (e.g. Upstash Redis) when traffic grows.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) buckets.clear();
  return true;
}
