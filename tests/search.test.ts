import { describe, expect, it } from "vitest";
import { DEV_ARTISTS, DEV_EVENTS, DEV_PRODUCTS, DEV_SERVICES } from "@/lib/data/dev-seed";
import { arabiziSkeleton } from "@/lib/search/normalize";
import { parseQuery } from "@/lib/search/parse";
import { search } from "@/lib/search/search";

const catalog = { artists: DEV_ARTISTS, products: DEV_PRODUCTS, services: DEV_SERVICES, events: DEV_EVENTS };

describe("arabizi skeleton", () => {
  it("collapses spelling variants", () => {
    expect(arabiziSkeleton("fa5ar")).toBe(arabiziSkeleton("fakhar"));
    expect(arabiziSkeleton("mousi9a")).toBe(arabiziSkeleton("musiqa"));
  });
});

describe("parseQuery", () => {
  it("understands Arabizi crafts", () => {
    expect(parseQuery("nheb fa5ar lel dar").filter.categories).toContain("pottery");
  });
  it("understands Arabic script with the definite article", () => {
    const r = parseQuery("ورشة الفخار");
    expect(r.filter.categories).toContain("pottery");
    expect(r.filter.kinds).toEqual(["event"]);
  });
  it("extracts French city and budget", () => {
    const r = parseQuery("musicien pour mariage à Sousse moins de 1000 dinars");
    expect(r.filter.city).toBe("Sousse");
    expect(r.filter.maxBudget).toBe(1000);
    expect(r.filter.categories).toContain("music");
  });
  it("tolerates a one-letter typo", () => {
    expect(parseQuery("potery").filter.categories).toContain("pottery");
  });
});

describe("search", () => {
  it("only returns records that exist in the catalog", () => {
    const ids = new Set([...DEV_ARTISTS, ...DEV_PRODUCTS, ...DEV_SERVICES, ...DEV_EVENTS].map((r) => r.id));
    for (const q of ["pottery", "carpet kairouan", "wedding music", "atelier"]) {
      for (const hit of search(catalog, parseQuery(q).filter)) expect(ids.has(hit.id)).toBe(true);
    }
  });
  it("applies the city as a hard filter", () => {
    const hits = search(catalog, parseQuery("pottery in Sfax").filter);
    expect(hits).toHaveLength(0);
  });
  it("excludes items above the budget but keeps unknown prices", () => {
    const hits = search(catalog, { ...parseQuery("olive wood").filter, maxBudget: 100 });
    const ids = hits.map((h) => h.id);
    expect(ids).toContain("dev-p6"); // 60 TND
    expect(ids).toContain("dev-p5"); // price on request
    expect(hits.find((h) => h.id === "dev-p5")?.unknown).toContain("price");
  });
  it("returns nothing for an empty or meaningless request", () => {
    expect(search(catalog, parseQuery("the and for").filter)).toHaveLength(0);
  });
  it("finds an artist by what their photos show", () => {
    const withPhotos = {
      ...catalog,
      artists: catalog.artists.map((a) =>
        a.id === "dev-a7" ? { ...a, gallery: [{ url: "x", productId: null, caption: null, description: "A silver butterfly poster", tags: ["butterfly", "poster"] }] } : a,
      ),
    };
    const hits = search(withPhotos, { text: "butterfly", kinds: [], categories: [], city: null, maxBudget: null, upcomingOnly: true });
    expect(hits[0]?.id).toBe("dev-a7");
    expect(hits[0]?.matched).toContain("picture:butterfly");
  });
  it("never shows past events", () => {
    const later = new Date(Date.now() + 365 * 24 * 3600 * 1000);
    expect(search(catalog, parseQuery("workshop").filter, { now: later }).filter((h) => h.kind === "event")).toHaveLength(0);
  });
});
