import type { z } from "zod";
import { fetchJson, UpstreamError } from "@/lib/api/http";
import { HOUR, TtlCache } from "@/lib/cache/ttl-cache";
import { getServerEnv } from "@/lib/env";
import type { WikiLanguage } from "./schemas";

const SERVICE = "wikipedia";

export type WikipediaClientOptions = {
  fetchImpl?: typeof fetch;
  urlTemplate?: string;
  userAgent?: string;
  timeoutMs?: number;
};

type CacheKind = "search" | "summary" | "links";

const TTL: Record<CacheKind, number> = {
  search: 3 * HOUR,
  summary: 24 * HOUR,
  links: 24 * HOUR,
};

/**
 * Server-only Wikipedia REST client. Adds an identifying User-Agent, applies timeouts and caches
 * successful responses (including 404 "not found" answers) per endpoint type.
 */
export class WikipediaClient {
  private readonly options: WikipediaClientOptions;
  private readonly caches: Record<CacheKind, TtlCache<unknown>> = {
    search: new TtlCache({ ttlMs: TTL.search, maxEntries: 1000 }),
    summary: new TtlCache({ ttlMs: TTL.summary, maxEntries: 1000 }),
    links: new TtlCache({ ttlMs: TTL.links, maxEntries: 1000 }),
  };

  constructor(options: WikipediaClientOptions = {}) {
    this.options = options;
  }

  origin(lang: WikiLanguage): string {
    const template = this.options.urlTemplate ?? getServerEnv().WIKIPEDIA_URL_TEMPLATE;
    return template.replace("{lang}", lang).replace(/\/+$/, "");
  }

  articleUrl(lang: WikiLanguage, title: string): string {
    return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  }

  /**
   * GETs a JSON endpoint. Returns null for 404, throws UpstreamError for other failures.
   */
  async get<T>(
    kind: CacheKind,
    lang: WikiLanguage,
    path: string,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
  ): Promise<T | null> {
    const url = `${this.origin(lang)}${path}`;
    const cache = this.caches[kind] as TtlCache<T | null>;
    const userAgent = this.options.userAgent ?? getServerEnv().WIKIPEDIA_USER_AGENT;
    return cache.getOrLoad(url, async () => {
      try {
        return await fetchJson({
          service: SERVICE,
          url,
          schema,
          init: { headers: { "User-Agent": userAgent, "Api-User-Agent": userAgent } },
          timeoutMs:
            this.options.timeoutMs ?? Math.min(getServerEnv().EXTERNAL_API_TIMEOUT_MS, 6000),
          signal,
          fetchImpl: this.options.fetchImpl,
        });
      } catch (error) {
        if (error instanceof UpstreamError && error.kind === "not_found") return null;
        throw error;
      }
    });
  }
}
