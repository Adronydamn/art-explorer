import type { WikipediaClient } from "./client";
import {
  type WikiLanguage,
  type WikiLanguageLink,
  type WikiSearchPage,
  wikiLanguageLinksSchema,
  wikiSearchResponseSchema,
} from "./schemas";

export const MAX_WIKI_QUERY_LENGTH = 120;

/** Title search: /w/rest.php/v1/search/title?q=…&limit=… */
export async function searchTitles(
  client: WikipediaClient,
  lang: WikiLanguage,
  query: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<WikiSearchPage[]> {
  const q = query.trim().slice(0, MAX_WIKI_QUERY_LENGTH);
  if (!q) return [];
  const params = new URLSearchParams({ q, limit: String(Math.min(Math.max(limit, 1), 10)) });
  const response = await client.get(
    "search",
    lang,
    `/w/rest.php/v1/search/title?${params}`,
    wikiSearchResponseSchema,
    signal,
  );
  return response?.pages ?? [];
}

/** Interlanguage links of an article: /w/rest.php/v1/page/{title}/links/language */
export async function getLanguageLinks(
  client: WikipediaClient,
  lang: WikiLanguage,
  title: string,
  signal?: AbortSignal,
): Promise<WikiLanguageLink[]> {
  const path = `/w/rest.php/v1/page/${encodeURIComponent(title.replace(/ /g, "_"))}/links/language`;
  return (await client.get("links", lang, path, wikiLanguageLinksSchema, signal)) ?? [];
}
