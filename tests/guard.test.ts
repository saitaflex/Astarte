import { describe, expect, it } from "vitest";
import { parseJsonObject, sanitizeText, validateExplanation } from "@/lib/discovery/guard";

describe("validateExplanation", () => {
  it("drops IDs the model invented", () => {
    const v = validateExplanation(
      { intro: "Here you go", items: [{ id: "dev-p1", reason: "Matches pottery" }, { id: "fake-99", reason: "Invented" }] },
      new Set(["dev-p1"]),
    );
    expect(Object.keys(v.reasons)).toEqual(["dev-p1"]);
    expect(v.dropped).toEqual(["fake-99"]);
  });

  it("removes contact details and links from reasons", () => {
    const text = sanitizeText("Call +216 22 333 444 or mail me@x.tn, see https://x.tn now");
    expect(text).not.toMatch(/216|@|https/);
  });

  it("caps long text", () => {
    expect(sanitizeText("a".repeat(500)).length).toBeLessThanOrEqual(180);
  });

  it("parses JSON wrapped in prose", () => {
    expect(parseJsonObject('Sure! ```json\n{"intro":"ok"}\n```')).toEqual({ intro: "ok" });
    expect(parseJsonObject("no json here")).toBeNull();
  });
});
