import type { AggregatedSearchResult, ArtworkSource, ArtworkSummary } from "@/lib/artwork/types";
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "@/lib/validation/schemas";

export const SUGGESTION_LIMIT = 8;
export const SUGGESTION_DEBOUNCE_MS = 300;
const CACHE_TTL_MS = 2 * 60_000;

export type SuggestionsPayload = {
  items: ArtworkSummary[];
  unavailableSources: ArtworkSource[];
};

type CacheEntry = { payload: SuggestionsPayload; expiresAt: number };

export class SuggestionsError extends Error {
  readonly kind: "network" | "unavailable";
  constructor(kind: "network" | "unavailable") {
    super(kind);
    this.kind = kind;
  }
}

/** Normalizes user input for suggestion requests (trim, collapse spaces, case-insensitive key). */
export function normalizeSuggestionQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

export function isQueryLongEnough(value: string): boolean {
  return normalizeSuggestionQuery(value).length >= MIN_QUERY_LENGTH;
}

/**
 * Client for /api/search tuned for autocomplete: short-lived cache and de-duplication of
 * identical in-flight requests. Callers pass an AbortSignal to cancel stale requests.
 */
export class SuggestionsClient {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  constructor(options: { fetchImpl?: typeof fetch; now?: () => number } = {}) {
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
    this.now = options.now ?? Date.now;
  }

  peek(query: string): SuggestionsPayload | undefined {
    const key = normalizeSuggestionQuery(query).toLowerCase();
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.payload;
  }

  async fetch(query: string, signal?: AbortSignal): Promise<SuggestionsPayload> {
    const normalized = normalizeSuggestionQuery(query);
    const cached = this.peek(normalized);
    if (cached) return cached;

    const params = new URLSearchParams({ q: normalized, limit: String(SUGGESTION_LIMIT / 2) });
    let response: Response;
    try {
      response = await this.fetchImpl(`/api/search?${params}`, {
        signal,
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new SuggestionsError("network");
    }
    if (!response.ok)
      throw new SuggestionsError(
        response.status >= 500 || response.status === 429 ? "unavailable" : "network",
      );

    const data = (await response.json()) as AggregatedSearchResult;
    const payload: SuggestionsPayload = {
      items: data.items.slice(0, SUGGESTION_LIMIT),
      unavailableSources: data.sources
        .filter((status) => !status.ok)
        .map((status) => status.source),
    };
    // Do not keep partial results for long: the failing source may come back.
    const ttl = payload.unavailableSources.length > 0 ? 15_000 : CACHE_TTL_MS;
    this.cache.set(normalized.toLowerCase(), { payload, expiresAt: this.now() + ttl });
    return payload;
  }
}
