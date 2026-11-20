import "server-only";

/** Common contract for every external AI service. Fails closed: never returns fake output. */
export class ProviderUnavailableError extends Error {
  constructor(
    public readonly provider: string,
    public readonly reason: "not_configured" | "timeout" | "http_error" | "bad_response",
    message?: string,
  ) {
    super(message ?? `${provider}: ${reason}`);
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Returns the raw text of the model reply. Throws ProviderUnavailableError on any failure. */
  chat(messages: ChatMessage[], opts: { model: "parse" | "explain"; json?: boolean; maxTokens?: number }): Promise<string>;
}

const OPENAI_COMPATIBLE_BASE: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1",
};

const DEFAULT_MODELS: Record<string, { parse: string; explain: string }> = {
  // 20b answers in about 1 s on Groq; 120b was slower and timed out under repeated use.
  groq: { parse: "openai/gpt-oss-20b", explain: "openai/gpt-oss-20b" },
};

class OpenAICompatibleProvider implements ChatProvider {
  constructor(
    readonly name: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly models: { parse: string; explain: string },
  ) {}

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async chat(messages: ChatMessage[], opts: { model: "parse" | "explain"; json?: boolean; maxTokens?: number }): Promise<string> {
    try {
      return await this.request(messages, opts);
    } catch (err) {
      // Strict JSON mode can reject a reply the model almost got right; retry once in plain mode.
      if (opts.json && err instanceof ProviderUnavailableError && err.reason === "http_error" && err.message.includes("HTTP 400")) {
        return this.request(messages, { ...opts, json: false });
      }
      throw err;
    }
  }

  private async request(messages: ChatMessage[], opts: { model: "parse" | "explain"; json?: boolean; maxTokens?: number }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.models[opts.model],
          messages,
          temperature: 0.2,
          max_completion_tokens: opts.maxTokens ?? 1200,
          // Reasoning models spend tokens thinking before answering; keep it short so the answer fits.
          ...(this.models[opts.model].includes("gpt-oss") ? { reasoning_effort: "low", include_reasoning: false } : {}),
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (!res.ok) throw new ProviderUnavailableError(this.name, "http_error", `${this.name} HTTP ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new ProviderUnavailableError(this.name, "bad_response");
      return text;
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ProviderUnavailableError(this.name, aborted ? "timeout" : "http_error");
    } finally {
      clearTimeout(timer);
    }
  }
}

let cached: ChatProvider | null | undefined;

/** Returns the configured provider, or null when AI is switched off. */
export function getChatProvider(): ChatProvider | null {
  if (cached !== undefined) return cached;
  const name = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const key = (process.env.AI_API_KEY ?? "").trim();
  const base = OPENAI_COMPATIBLE_BASE[name];
  if (!name || !key || !base) {
    cached = null;
    return null;
  }
  const defaults = DEFAULT_MODELS[name];
  cached = new OpenAICompatibleProvider(name, base, key, {
    parse: process.env.AI_MODEL_PARSE || defaults.parse,
    explain: process.env.AI_MODEL_EXPLAIN || defaults.explain,
  });
  return cached;
}
