import type {
  AggregatedSearchResult,
  ArtworkSource,
  ArtworkSummary,
  ProviderSearchResult,
  SourceStatus,
} from "@/lib/artwork/types";
import { ARTWORK_SOURCES } from "@/lib/artwork/types";
import { logServerError } from "@/lib/api/http";
import { normalizeForMatch } from "@/lib/utils/text";
import type { ArtworkProvider } from "./artwork-provider";

export type AggregateSearchParams = {
  query: string;
  source?: ArtworkSource | "all";
  hasImage?: boolean;
  publicDomain?: boolean;
  page?: number;
  /** Items requested from each provider. */
  perSource?: number;
  signal?: AbortSignal;
};

function matchRank(item: ArtworkSummary, normalizedQuery: string): number {
  const title = normalizeForMatch(item.title);
  if (title === normalizedQuery) return 0;
  if (title.startsWith(normalizedQuery)) return 1;
  if (title.includes(normalizedQuery)) return 2;
  return 3;
}

/**
 * Interleaves provider results (each list already ranked by its own relevance) and moves
 * exact / prefix title matches to the top. Sorting is stable, so museum order is kept otherwise.
 */
export function mergeResults(query: string, results: ProviderSearchResult[]): ArtworkSummary[] {
  const normalizedQuery = normalizeForMatch(query);
  const interleaved: ArtworkSummary[] = [];
  const longest = Math.max(0, ...results.map((result) => result.items.length));
  for (let index = 0; index < longest; index += 1) {
    for (const result of results) {
      const item = result.items[index];
      if (item) interleaved.push(item);
    }
  }
  const seen = new Set<string>();
  return interleaved
    .filter((item) => {
      const key = `${item.source}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item, order) => ({ item, order, rank: matchRank(item, normalizedQuery) }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map(({ item }) => item);
}

/**
 * Queries all selected providers in parallel. A failing provider never fails the whole search:
 * it is reported in `sources` with `ok: false`, and results of the other provider are returned.
 */
export async function aggregateSearch(
  providers: Record<ArtworkSource, ArtworkProvider>,
  {
    query,
    source = "all",
    hasImage,
    publicDomain,
    page = 1,
    perSource = 12,
    signal,
  }: AggregateSearchParams,
): Promise<AggregatedSearchResult> {
  const selected = ARTWORK_SOURCES.filter((key) => source === "all" || source === key);
  const settled = await Promise.allSettled(
    selected.map((key) =>
      providers[key].search(query, { limit: perSource, page, hasImage, publicDomain, signal }),
    ),
  );

  const statuses: SourceStatus[] = [];
  const successful: ProviderSearchResult[] = [];
  settled.forEach((outcome, index) => {
    const key = selected[index] as ArtworkSource;
    if (outcome.status === "fulfilled") {
      successful.push(outcome.value);
      statuses.push({ source: key, ok: true, total: outcome.value.total });
    } else {
      logServerError(`search:${key}`, outcome.reason);
      statuses.push({ source: key, ok: false, total: 0 });
    }
  });

  if (successful.length === 0) {
    throw new AllSourcesFailedError();
  }

  return {
    query,
    items: mergeResults(query, successful),
    total: successful.reduce((sum, result) => sum + result.total, 0),
    page,
    hasMore: successful.some((result) => result.total > page * perSource),
    sources: statuses,
  };
}

export class AllSourcesFailedError extends Error {
  constructor() {
    super("All artwork sources are unavailable");
    this.name = "AllSourcesFailedError";
  }
}
