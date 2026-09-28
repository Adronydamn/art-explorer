import type {
  Artwork,
  ArtworkSummary,
  ProviderSearchResult,
  SearchOptions,
} from "@/lib/artwork/types";
import type { ArtworkProvider, RelatedQuery } from "@/lib/api/providers/artwork-provider";
import { fetchJson, UpstreamError } from "@/lib/api/http";
import { getServerEnv } from "@/lib/env";
import { normalizeForMatch } from "@/lib/utils/text";
import { normalizeCmaArtwork, normalizeCmaSummary } from "./normalize";
import { CMA_SEARCH_FIELDS, cmaDetailResponseSchema, cmaSearchResponseSchema } from "./schemas";

const SERVICE = "cma";
const PREFIX_FALLBACK_POOL = 40;

export type CmaClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export class CmaArtworkProvider implements ArtworkProvider {
  readonly source = "cma" as const;
  private readonly baseUrl?: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(options: CmaClientOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.fetchImpl = options.fetchImpl;
  }

  private get apiUrl(): string {
    return (this.baseUrl ?? getServerEnv().CMA_API_URL).replace(/\/+$/, "");
  }

  private async runSearch(
    params: Record<string, string | number | undefined>,
    signal?: AbortSignal,
  ): Promise<{ items: ArtworkSummary[]; total: number }> {
    const search = new URLSearchParams({ type: "Painting", fields: CMA_SEARCH_FIELDS.join(",") });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    const response = await fetchJson({
      service: SERVICE,
      url: `${this.apiUrl}/artworks/?${search.toString()}`,
      schema: cmaSearchResponseSchema,
      signal,
      fetchImpl: this.fetchImpl,
    });
    return {
      items: response.data.map(normalizeCmaSummary),
      total: response.info?.total ?? response.data.length,
    };
  }

  async search(query: string, options: SearchOptions = {}): Promise<ProviderSearchResult> {
    const limit = options.limit ?? 12;
    const page = options.page ?? 1;
    const filters = {
      has_image: options.hasImage ? 1 : undefined,
      cc0: options.publicDomain ? 1 : undefined,
    };
    const primary = await this.runSearch(
      { q: query, limit, skip: (page - 1) * limit, ...filters },
      options.signal,
    );
    if (primary.total > 0 || page > 1) return { source: this.source, ...primary };

    // CMA full-text search matches whole words only. For autocomplete ("water lil") retry
    // without the unfinished last word and keep titles containing a word with that prefix.
    const words = query.trim().split(/\s+/);
    const partial = normalizeForMatch(words.at(-1) ?? "");
    if (words.length < 2 || partial.length === 0) return { source: this.source, ...primary };
    const pool = await this.runSearch(
      { q: words.slice(0, -1).join(" "), limit: PREFIX_FALLBACK_POOL, ...filters },
      options.signal,
    );
    const items = pool.items.filter((item) =>
      normalizeForMatch(item.title)
        .split(" ")
        .some((word) => word.startsWith(partial)),
    );
    return { source: this.source, items: items.slice(0, limit), total: items.length };
  }

  async getById(id: string, options: { signal?: AbortSignal } = {}): Promise<Artwork | null> {
    try {
      const response = await fetchJson({
        service: SERVICE,
        url: `${this.apiUrl}/artworks/${encodeURIComponent(id)}`,
        schema: cmaDetailResponseSchema,
        signal: options.signal,
        fetchImpl: this.fetchImpl,
      });
      return normalizeCmaArtwork(response.data);
    } catch (error) {
      if (error instanceof UpstreamError && error.kind === "not_found") return null;
      throw error;
    }
  }

  async findRelated(
    query: RelatedQuery,
  ): Promise<{ byArtist: ArtworkSummary[]; byStyle: ArtworkSummary[] }> {
    // CMA has no style field; only same-artist relations can be established reliably.
    const artist = query.artistName?.split(",")[0]?.trim();
    if (!artist) return { byArtist: [], byStyle: [] };
    const { items } = await this.runSearch(
      { artists: artist, has_image: 1, limit: query.limit + 1 },
      query.signal,
    );
    return {
      byArtist: items.filter((item) => item.id !== query.excludeId).slice(0, query.limit),
      byStyle: [],
    };
  }
}
