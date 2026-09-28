import { aggregateSearch, type AggregateSearchParams } from "@/lib/api/providers/aggregate-search";
import { getProvider, getProviders } from "@/lib/api/providers/registry";
import { logServerError } from "@/lib/api/http";
import { WikipediaStyleProvider } from "@/lib/api/wikipedia/provider";
import { combineRelated, MAX_RELATED } from "@/lib/artwork/related";
import type {
  AggregatedSearchResult,
  Artwork,
  ArtworkSource,
  ArtworkSummary,
  RelatedArtwork,
  StyleContextResult,
} from "@/lib/artwork/types";
import { toSummary } from "@/lib/artwork/types";
import { HOUR, MINUTE, TtlCache } from "@/lib/cache/ttl-cache";
import {
  localizeArtwork,
  localizeArtworkDetails,
  localizeRelatedArtworks,
  localizeSummaries,
} from "@/lib/translation/artwork-translator";

/** Short TTL for search results, longer for records that rarely change. */
export const CACHE_TTL = {
  search: 5 * MINUTE,
  artwork: 6 * HOUR,
  related: 6 * HOUR,
} as const;

const searchCache = new TtlCache<AggregatedSearchResult>({
  ttlMs: CACHE_TTL.search,
  maxEntries: 500,
});
const artworkCache = new TtlCache<Artwork | null>({ ttlMs: CACHE_TTL.artwork, maxEntries: 1000 });
const localizedArtworkCache = new TtlCache<Artwork>({ ttlMs: CACHE_TTL.artwork, maxEntries: 1000 });
const localizedDetailsCache = new TtlCache<Artwork>({ ttlMs: CACHE_TTL.artwork, maxEntries: 1000 });
const relatedCache = new TtlCache<RelatedArtwork[]>({ ttlMs: CACHE_TTL.related, maxEntries: 500 });

let styleProvider: WikipediaStyleProvider | undefined;

export function getStyleProvider(): WikipediaStyleProvider {
  styleProvider ??= new WikipediaStyleProvider();
  return styleProvider;
}

export async function searchArtworks(
  params: Omit<AggregateSearchParams, "signal">,
): Promise<AggregatedSearchResult> {
  const key = JSON.stringify([
    params.query.toLowerCase(),
    params.source ?? "all",
    Boolean(params.hasImage),
    Boolean(params.publicDomain),
    params.page ?? 1,
    params.perSource ?? 12,
  ]);
  // Partial results (one source failed) are cached only briefly so the source can recover.
  const result = await searchCache.getOrLoad(key, () => aggregateSearch(getProviders(), params));
  if (result.sources.some((status) => !status.ok)) {
    searchCache.set(key, result, 30_000);
  }
  result.items = await localizeSummaries(result.items);
  return result;
}

/** Raw museum record used for Wikipedia lookups and related-work searches. */
export async function getRawArtwork(source: ArtworkSource, id: string): Promise<Artwork | null> {
  return artworkCache.getOrLoad(`${source}:${id}`, () => getProvider(source).getById(id));
}

/** Returns the normalized artwork localized for display, null when it does not exist; throws when the museum is down. */
export async function getArtwork(source: ArtworkSource, id: string): Promise<Artwork | null> {
  const raw = await getRawArtwork(source, id);
  if (!raw) return null;
  return localizedArtworkCache.getOrLoad(`${source}:${id}`, () => localizeArtwork(raw));
}

/** Translates long museum prose on demand so the initial page render is not blocked. */
export async function getLocalizedArtworkDetails(source: ArtworkSource, id: string): Promise<Artwork | null> {
  const raw = await getRawArtwork(source, id);
  if (!raw) return null;
  return localizedDetailsCache.getOrLoad(`${source}:${id}`, () => localizeArtworkDetails(raw));
}

/** Never throws: Wikipedia failures degrade to museum-only data. */
export async function getStyleContext(artwork: Artwork): Promise<StyleContextResult> {
  try {
    return await getStyleProvider().getStyleContext(artwork);
  } catch (error) {
    logServerError("style-context", error);
    return { context: null, wikipediaUnavailable: true };
  }
}

/** Related works based on museum relations only (same artist, then same museum style). */
export async function getRelatedArtworks(artwork: Artwork): Promise<RelatedArtwork[]> {
  const key = `${artwork.source}:${artwork.id}`;
  try {
    const related = await relatedCache.getOrLoad(key, async () => {
      const { byArtist, byStyle } = await getProvider(artwork.source).findRelated({
        artistId: artwork.artistId,
        artistName: artwork.artistName,
        styleId: artwork.styleId,
        style: artwork.style,
        excludeId: artwork.id,
        limit: MAX_RELATED,
      });
      return combineRelated(key, [
        { reason: "artist", items: byArtist },
        { reason: "style", items: byStyle },
      ]);
    });
    return localizeRelatedArtworks(related);
  } catch (error) {
    logServerError("related", error);
    return [];
  }
}

/** Curated list of record ids for the home page. Titles and images are always loaded live. */
export const FEATURED_ARTWORKS: ReadonlyArray<{ source: ArtworkSource; id: string }> = [
  { source: "aic", id: "27992" },
  { source: "cma", id: "136510" },
  { source: "aic", id: "28560" },
  { source: "cma", id: "141639" },
  { source: "aic", id: "111442" },
  { source: "cma", id: "135382" },
];

export async function getFeaturedArtworks(): Promise<ArtworkSummary[]> {
  const settled = await Promise.allSettled(
    FEATURED_ARTWORKS.map(({ source, id }) => getArtwork(source, id)),
  );
  const summaries = settled.flatMap((outcome) => {
    if (outcome.status === "rejected") {
      logServerError("featured", outcome.reason);
      return [];
    }
    const artwork = outcome.value;
    return artwork?.image ? [toSummary(artwork)] : [];
  });
  return localizeSummaries(summaries);
}
