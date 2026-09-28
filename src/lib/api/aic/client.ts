import type {
  Artwork,
  ArtworkSummary,
  ProviderSearchResult,
  SearchOptions,
} from "@/lib/artwork/types";
import type { ArtworkProvider, RelatedQuery } from "@/lib/api/providers/artwork-provider";
import { fetchJson, UpstreamError } from "@/lib/api/http";
import { APP_USER_AGENT, getServerEnv } from "@/lib/env";
import { normalizeAicArtwork, normalizeAicSummary } from "./normalize";
import {
  AIC_DETAIL_FIELDS,
  AIC_SEARCH_FIELDS,
  aicDetailResponseSchema,
  aicSearchResponseSchema,
} from "./schemas";

const SERVICE = "aic";
/** AIC "Painting" artwork type. */
const PAINTING_TYPE_ID = 1;
/** AIC rejects deep pagination (> 10 000 results). */
const MAX_WINDOW = 1000;

type EsClause = Record<string, unknown>;

export type AicClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export class AicArtworkProvider implements ArtworkProvider {
  readonly source = "aic" as const;
  private readonly baseUrl?: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(options: AicClientOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.fetchImpl = options.fetchImpl;
  }

  private get apiUrl(): string {
    return (this.baseUrl ?? getServerEnv().AIC_API_URL).replace(/\/+$/, "");
  }

  private async runSearch(
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{ items: ArtworkSummary[]; total: number }> {
    const response = await fetchJson({
      service: SERVICE,
      url: `${this.apiUrl}/artworks/search`,
      schema: aicSearchResponseSchema,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json", "AIC-User-Agent": APP_USER_AGENT },
        body: JSON.stringify(body),
      },
      signal,
      fetchImpl: this.fetchImpl,
    });
    return {
      items: response.data.map((record) => normalizeAicSummary(record, response.config)),
      total: response.pagination?.total ?? response.data.length,
    };
  }

  private filters(options: { hasImage?: boolean; publicDomain?: boolean }): EsClause[] {
    const filter: EsClause[] = [{ term: { artwork_type_id: PAINTING_TYPE_ID } }];
    if (options.hasImage) filter.push({ exists: { field: "image_id" } });
    if (options.publicDomain) filter.push({ term: { is_public_domain: true } });
    return filter;
  }

  async search(query: string, options: SearchOptions = {}): Promise<ProviderSearchResult> {
    const limit = options.limit ?? 12;
    const page = options.page ?? 1;
    if ((page - 1) * limit >= MAX_WINDOW) return { source: this.source, items: [], total: 0 };

    const { items, total } = await this.runSearch(
      {
        limit,
        page,
        fields: AIC_SEARCH_FIELDS,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  // bool_prefix makes the last word a prefix, which powers autocomplete.
                  type: "bool_prefix",
                  operator: "and",
                  fields: ["title^4", "alt_titles^3", "artist_title^2", "artist_display"],
                },
              },
            ],
            filter: this.filters(options),
          },
        },
      },
      options.signal,
    );
    return { source: this.source, items, total: Math.min(total, MAX_WINDOW) };
  }

  async getById(id: string, options: { signal?: AbortSignal } = {}): Promise<Artwork | null> {
    try {
      const fields = AIC_DETAIL_FIELDS.join(",");
      const response = await fetchJson({
        service: SERVICE,
        url: `${this.apiUrl}/artworks/${encodeURIComponent(id)}?fields=${fields}`,
        schema: aicDetailResponseSchema,
        init: { headers: { "AIC-User-Agent": APP_USER_AGENT } },
        signal: options.signal,
        fetchImpl: this.fetchImpl,
      });
      return normalizeAicArtwork(response.data, response.config);
    } catch (error) {
      if (error instanceof UpstreamError && error.kind === "not_found") return null;
      throw error;
    }
  }

  async findRelated(
    query: RelatedQuery,
  ): Promise<{ byArtist: ArtworkSummary[]; byStyle: ArtworkSummary[] }> {
    const exclude = { term: { id: Number(query.excludeId) } };
    const base = this.filters({ hasImage: true });
    const run = (clause: EsClause) =>
      this.runSearch(
        {
          limit: query.limit + 1,
          fields: AIC_SEARCH_FIELDS,
          query: { bool: { filter: [...base, clause], must_not: [exclude] } },
        },
        query.signal,
      ).then((result) =>
        result.items.filter((item) => item.id !== query.excludeId).slice(0, query.limit),
      );

    const [byArtist, byStyle] = await Promise.all([
      query.artistId ? run({ term: { artist_id: Number(query.artistId) } }) : Promise.resolve([]),
      query.styleId ? run({ term: { style_id: query.styleId } }) : Promise.resolve([]),
    ]);
    return { byArtist, byStyle };
  }
}
