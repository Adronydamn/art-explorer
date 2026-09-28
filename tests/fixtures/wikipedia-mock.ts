import wikipedia from "./wikipedia.json" with { type: "json" };

type Json = Record<string, unknown>;

type WikiFixtures = {
  search: Record<string, Record<string, unknown[]>>;
  summary: Record<string, Record<string, Json>>;
  links: Record<string, Record<string, unknown[]>>;
  unavailableTerms: string[];
};

const data = wikipedia as WikiFixtures;

export type MockResponse = { status: number; body: unknown };

function decodeTitle(segment: string): string {
  return decodeURIComponent(segment).replace(/_/g, " ");
}

function isUnavailable(value: string): boolean {
  const lower = value.toLowerCase();
  return data.unavailableTerms.some((term) => lower.includes(term));
}

/**
 * Resolves a Wikipedia REST request (`/w/rest.php/...` or `/api/rest_v1/...`) against fixtures.
 * Shared by unit tests (via fetch mocks) and the e2e mock server.
 */
export function resolveWikipedia(lang: string, pathWithQuery: string): MockResponse {
  const url = new URL(pathWithQuery, "http://mock.local");
  const path = url.pathname;

  if (path === "/w/rest.php/v1/search/title") {
    const q = (url.searchParams.get("q") ?? "").trim();
    if (isUnavailable(q)) return { status: 503, body: { error: "unavailable" } };
    return { status: 200, body: { pages: data.search[lang]?.[q.toLowerCase()] ?? [] } };
  }

  const summary = /^\/api\/rest_v1\/page\/summary\/(.+)$/.exec(path);
  if (summary?.[1]) {
    const title = decodeTitle(summary[1]);
    if (isUnavailable(title)) return { status: 503, body: {} };
    const entry = data.summary[lang]?.[title];
    return entry ? { status: 200, body: entry } : { status: 404, body: { type: "not_found" } };
  }

  const links = /^\/w\/rest\.php\/v1\/page\/(.+)\/links\/language$/.exec(path);
  if (links?.[1]) {
    const title = decodeTitle(links[1]);
    const entry = data.links[lang]?.[title];
    return entry ? { status: 200, body: entry } : { status: 404, body: {} };
  }

  return { status: 404, body: {} };
}
