import { describe, expect, it } from "vitest";
import type { ArtworkProvider } from "@/lib/api/providers/artwork-provider";
import {
  aggregateSearch,
  AllSourcesFailedError,
  mergeResults,
} from "@/lib/api/providers/aggregate-search";
import { UpstreamError } from "@/lib/api/http";
import type { ArtworkSource, ArtworkSummary, ProviderSearchResult } from "@/lib/artwork/types";
import { SOURCE_LABELS } from "@/lib/artwork/types";

function item(source: ArtworkSource, id: string, title: string): ArtworkSummary {
  return {
    id,
    source,
    sourceLabel: SOURCE_LABELS[source],
    sourceUrl: `https://example.org/${id}`,
    title,
  };
}

function provider(source: ArtworkSource, result: ProviderSearchResult | Error): ArtworkProvider {
  return {
    source,
    search: async () => {
      if (result instanceof Error) throw result;
      return result;
    },
    getById: async () => null,
    findRelated: async () => ({ byArtist: [], byStyle: [] }),
  };
}

const aicResult: ProviderSearchResult = {
  source: "aic",
  total: 30,
  items: [item("aic", "1", "Water Lily Pond"), item("aic", "2", "Water Lilies")],
};
const cmaResult: ProviderSearchResult = {
  source: "cma",
  total: 2,
  items: [
    item("cma", "10", "Landscape with water"),
    item("cma", "11", "Water Lilies (Agapanthus)"),
  ],
};

describe("mergeResults", () => {
  it("interleaves sources and ranks exact/prefix title matches first", () => {
    const merged = mergeResults("water lilies", [aicResult, cmaResult]);
    expect(merged.map((entry) => `${entry.source}:${entry.id}`)).toEqual([
      "aic:2",
      "cma:11",
      "aic:1",
      "cma:10",
    ]);
  });

  it("removes duplicates", () => {
    const merged = mergeResults("x", [aicResult, aicResult]);
    expect(merged).toHaveLength(2);
  });
});

describe("aggregateSearch", () => {
  it("combines results and totals from both museums", async () => {
    const result = await aggregateSearch(
      { aic: provider("aic", aicResult), cma: provider("cma", cmaResult) },
      { query: "water", perSource: 2 },
    );
    expect(result.items).toHaveLength(4);
    expect(result.total).toBe(32);
    expect(result.hasMore).toBe(true);
    expect(result.sources.every((status) => status.ok)).toBe(true);
  });

  it("keeps working when one source fails", async () => {
    const result = await aggregateSearch(
      {
        aic: provider("aic", new UpstreamError("aic", "timeout", "Timed out")),
        cma: provider("cma", cmaResult),
      },
      { query: "water" },
    );
    expect(result.items.map((entry) => entry.source)).toEqual(["cma", "cma"]);
    expect(result.sources).toEqual([
      { source: "aic", ok: false, total: 0 },
      { source: "cma", ok: true, total: 2 },
    ]);
  });

  it("queries only the selected source", async () => {
    const result = await aggregateSearch(
      { aic: provider("aic", new Error("must not be called")), cma: provider("cma", cmaResult) },
      { query: "water", source: "cma" },
    );
    expect(result.sources).toHaveLength(1);
  });

  it("throws when all sources fail", async () => {
    await expect(
      aggregateSearch(
        {
          aic: provider("aic", new Error("down")),
          cma: provider("cma", new UpstreamError("cma", "server", "HTTP 500", 500)),
        },
        { query: "water" },
      ),
    ).rejects.toBeInstanceOf(AllSourcesFailedError);
  });
});
