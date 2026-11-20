import "server-only";

/**
 * Describes what a photo shows (object, materials, colours, motifs) for search.
 * Uses the configured OpenAI-compatible provider's vision model. Returns null on any
 * failure: search still works from titles and captions.
 */
export async function describeImage(imageUrl: string): Promise<{ description: string; tags: string[]; model: string } | null> {
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const key = (process.env.AI_API_KEY ?? "").trim();
  if (provider !== "groq" || !key) return null;
  const model = process.env.AI_MODEL_VISION || "qwen/qwen3.8-27b";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_completion_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Describe what this photo shows for a search index of handmade art. Return ONLY JSON: {"description": string (one factual sentence: the object or scene, materials, colours, motifs), "tags": string[] (6-12 short lowercase English search words, e.g. "mosaic", "table", "olive tree", "blue")}. Do not guess who made it, how it was made, prices or places.',
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { description?: unknown; tags?: unknown };
    const description = typeof json.description === "string" ? json.description.slice(0, 300) : "";
    const tags = Array.isArray(json.tags) ? json.tags.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase().slice(0, 40)).slice(0, 12) : [];
    return description ? { description, tags, model } : null;
  } catch {
    return null;
  }
}
