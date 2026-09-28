import { resolveWikipedia } from "../fixtures/wikipedia-mock";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** fetch implementation that serves Wikipedia fixtures for https://{lang}.wikipedia.org URLs. */
export function wikipediaFixtureFetch(calls: string[] = []): typeof fetch {
  return async (input) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    );
    calls.push(url.href);
    const lang = url.hostname.split(".")[0] ?? "en";
    const { status, body } = resolveWikipedia(lang, `${url.pathname}${url.search}`);
    return jsonResponse(body, status);
  };
}
