import { describe, expect, it } from "vitest";
import { coViews, diversify, score, tasteVector, type Candidate, type Signals } from "../src/lib/recommend/engine";

const c = (id: string, artistId: string, category: string, extra: Partial<Candidate> = {}): Candidate => ({
  id, artistId, category, materials: [], technique: null, isDemo: false, ...extra,
});

describe("recommendation engine", () => {
  it("ranks content-similar items first and explains why", () => {
    const seed = c("s", "a0", "mosaic", { technique: "Stone mosaic", materials: ["stone"] });
    const cands = [c("x", "a1", "mosaic", { technique: "Stone mosaic", materials: ["stone"] }), c("y", "a2", "jewelry")];
    const sig: Signals = { content: new Map([["x", 0.8], ["y", 0.1]]), coView: new Map(), views: new Map() };
    const [first, second] = score(cands, sig, seed).sort((a, b) => b.score - a.score);
    expect(first.id).toBe("x");
    expect(first.reasons).toContain("sameTechnique");
    expect(second.id).toBe("y");
  });

  it("uses co-views from other visitors", () => {
    const rows = [
      { visitor_id: "v1", product_id: "s" }, { visitor_id: "v1", product_id: "z" },
      { visitor_id: "v2", product_id: "s" }, { visitor_id: "v2", product_id: "z" },
      { visitor_id: "v3", product_id: "q" },
    ];
    const co = coViews(rows, new Set(["s"]));
    expect(co.get("z")).toBe(2);
    expect(co.has("q")).toBe(false);
  });

  it("diversifies away from a single artist", () => {
    const cands = [c("a", "A", "mosaic"), c("b", "A", "mosaic"), c("d", "B", "painting")];
    const sig: Signals = { content: new Map([["a", 0.9], ["b", 0.88], ["d", 0.75]]), coView: new Map(), views: new Map() };
    const byId = new Map(cands.map((x) => [x.id, x]));
    const top2 = diversify(score(cands, sig), byId, 2).map((s) => s.id);
    expect(top2).toEqual(["a", "d"]);
  });

  it("builds a normalised taste vector", () => {
    const v = tasteVector([[1, 0], [0, 1]])!;
    expect(Math.hypot(...v)).toBeCloseTo(1);
    expect(v[0]).toBeCloseTo(v[1]);
  });
});
