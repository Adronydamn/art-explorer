import type {
  Artwork,
  ArtworkSource,
  ArtworkSummary,
  ProviderSearchResult,
  SearchOptions,
} from "@/lib/artwork/types";

export type RelatedQuery = {
  artistId?: string;
  artistName?: string;
  styleId?: string;
  style?: string;
  excludeId: string;
  limit: number;
  signal?: AbortSignal;
};

export interface ArtworkProvider {
  readonly source: ArtworkSource;
  search(query: string, options?: SearchOptions): Promise<ProviderSearchResult>;
  getById(id: string, options?: { signal?: AbortSignal }): Promise<Artwork | null>;
  /** Works by the same artist / in the same museum style. Only museum-stated relations. */
  findRelated(
    query: RelatedQuery,
  ): Promise<{ byArtist: ArtworkSummary[]; byStyle: ArtworkSummary[] }>;
}
