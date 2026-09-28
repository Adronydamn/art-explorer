import type { WikipediaClient } from "./client";
import { type WikiLanguage, type WikiSummaryRaw, wikiSummarySchema } from "./schemas";

/** Page summary: /api/rest_v1/page/summary/{title}. Returns null when the page does not exist. */
export async function getSummary(
  client: WikipediaClient,
  lang: WikiLanguage,
  title: string,
  signal?: AbortSignal,
): Promise<WikiSummaryRaw | null> {
  const path = `/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  return client.get("summary", lang, path, wikiSummarySchema, signal);
}
