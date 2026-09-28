import { describe, expect, it, vi } from "vitest";
import { fetchJson, UpstreamError } from "@/lib/api/http";
import { RateLimiter } from "@/lib/api/rate-limit";
import { combineRelated } from "@/lib/artwork/related";
import { SOURCE_LABELS, type ArtworkSummary } from "@/lib/artwork/types";
import { TtlCache } from "@/lib/cache/ttl-cache";
import { sanitizeHtml } from "@/lib/security/sanitize";
import { SuggestionsClient } from "@/lib/search/suggestions-client";
import { cleanText, splitHighlight, stripHtml, truncateText } from "@/lib/utils/text";
import { z } from "zod";
import { jsonResponse } from "./helpers";

describe("text utils", () => {
  it("highlights matches as plain parts (no HTML)", () => {
    expect(splitHighlight("Water Lilies", "lil")).toEqual([
      { text: "Water ", match: false },
      { text: "Lil", match: true },
      { text: "ies", match: false },
    ]);
    expect(splitHighlight("<b>x</b>", "b")).toEqual([
      { text: "<", match: false },
      { text: "b", match: true },
      { text: ">x</", match: false },
      { text: "b", match: true },
      { text: ">", match: false },
    ]);
    expect(splitHighlight("Text", "  ")).toEqual([{ text: "Text", match: false }]);
  });

  it("cleans placeholders and strips HTML", () => {
    expect(cleanText(" null ")).toBeUndefined();
    expect(cleanText("  a  b ")).toBe("a b");
    expect(stripHtml("<p>One</p><p>Two &amp; three</p>")).toBe("One\n\nTwo & three");
  });

  it("truncates at word boundaries with an ellipsis", () => {
    expect(truncateText("short", 10)).toBe("short");
    const result = truncateText("word ".repeat(50), 42);
    expect(result.length).toBeLessThanOrEqual(42);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("sanitizeHtml (museum descriptions)", () => {
  it("keeps allowed formatting and converts <i>/<b>", () => {
    expect(sanitizeHtml("<p><i>Water Lilies</i> by <b>Monet</b></p>")).toBe(
      "<p><em>Water Lilies</em> by <strong>Monet</strong></p>",
    );
  });

  it("removes dangerous markup and URLs", () => {
    const clean = sanitizeHtml(
      '<p style="x" onmouseover="y">t</p><a href="data:text/html,x">d</a><svg><script>1</script></svg>',
    );
    expect(clean).toBe("<p>t</p><a>d</a>");
  });
});

describe("TtlCache", () => {
  it("expires entries and de-duplicates in-flight loads", async () => {
    let now = 0;
    const cache = new TtlCache<number>({ ttlMs: 100, now: () => now });
    const loader = vi.fn(async () => 42);
    const [a, b] = await Promise.all([cache.getOrLoad("k", loader), cache.getOrLoad("k", loader)]);
    expect([a, b]).toEqual([42, 42]);
    expect(loader).toHaveBeenCalledTimes(1);
    now = 150;
    expect(cache.get("k")).toBeUndefined();
  });

  it("does not cache failures", async () => {
    const cache = new TtlCache<number>({ ttlMs: 100 });
    await expect(
      cache.getOrLoad("k", async () => Promise.reject(new Error("x"))),
    ).rejects.toThrow();
    await expect(cache.getOrLoad("k", async () => 1)).resolves.toBe(1);
  });
});

describe("fetchJson", () => {
  const schema = z.object({ ok: z.boolean() });

  it("maps HTTP errors and validates payloads", async () => {
    await expect(
      fetchJson({
        service: "t",
        url: "https://x",
        schema,
        fetchImpl: async () => jsonResponse({}, 429),
      }),
    ).rejects.toMatchObject({
      kind: "rate_limited",
    });
    await expect(
      fetchJson({
        service: "t",
        url: "https://x",
        schema,
        fetchImpl: async () => jsonResponse({ ok: "no" }),
      }),
    ).rejects.toMatchObject({
      kind: "invalid_response",
    });
    await expect(
      fetchJson({
        service: "t",
        url: "https://x",
        schema,
        fetchImpl: async () => jsonResponse({ ok: true }),
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("times out", async () => {
    const hanging: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      );
    const error = await fetchJson({
      service: "t",
      url: "https://x",
      schema,
      timeoutMs: 20,
      fetchImpl: hanging,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).kind).toBe("timeout");
    expect((error as UpstreamError).isTemporary).toBe(true);
  });
});

describe("RateLimiter", () => {
  it("limits bursts and refills over time", () => {
    let now = 0;
    const limiter = new RateLimiter({ capacity: 2, refillPerSecond: 1, now: () => now });
    expect(limiter.consume("ip").allowed).toBe(true);
    expect(limiter.consume("ip").allowed).toBe(true);
    expect(limiter.consume("ip")).toEqual({ allowed: false, retryAfter: 1 });
    expect(limiter.consume("other").allowed).toBe(true);
    now = 1000;
    expect(limiter.consume("ip").allowed).toBe(true);
  });
});

describe("combineRelated", () => {
  const make = (id: string): ArtworkSummary => ({
    id,
    source: "aic",
    sourceLabel: SOURCE_LABELS.aic,
    sourceUrl: "https://x",
    title: id,
  });

  it("keeps priority order, excludes the current work and caps at 6", () => {
    const result = combineRelated("aic:1", [
      { reason: "artist", items: [make("1"), make("2"), make("3")] },
      {
        reason: "style",
        items: [make("3"), make("4"), make("5"), make("6"), make("7"), make("8")],
      },
    ]);
    expect(result.map((item) => `${item.id}:${item.reason}`)).toEqual([
      "2:artist",
      "3:artist",
      "4:style",
      "5:style",
      "6:style",
      "7:style",
    ]);
  });
});

describe("SuggestionsClient", () => {
  it("caches results so identical queries are not re-requested", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        query: "monet",
        items: [],
        total: 0,
        page: 1,
        hasMore: false,
        sources: [{ source: "aic", ok: true, total: 0 }],
      }),
    );
    const client = new SuggestionsClient({ fetchImpl });
    await client.fetch("Monet");
    await client.fetch("  monet ");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toBe("/api/search?q=Monet&limit=4");
  });

  it("reports partially unavailable sources and service errors", async () => {
    const partial = new SuggestionsClient({
      fetchImpl: async () =>
        jsonResponse({
          query: "x",
          items: [],
          total: 0,
          page: 1,
          hasMore: false,
          sources: [
            { source: "aic", ok: false, total: 0 },
            { source: "cma", ok: true, total: 0 },
          ],
        }),
    });
    expect((await partial.fetch("water")).unavailableSources).toEqual(["aic"]);

    const down = new SuggestionsClient({ fetchImpl: async () => jsonResponse({}, 503) });
    await expect(down.fetch("water")).rejects.toMatchObject({ kind: "unavailable" });
  });
});
