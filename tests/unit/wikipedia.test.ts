import { describe, expect, it } from "vitest";
import {
  isRelevantArticle,
  normalizeSummary,
  titleMatchesTerm,
} from "@/lib/api/wikipedia/normalize";
import { WikipediaStyleProvider } from "@/lib/api/wikipedia/provider";
import { sanitizeWikipediaHtml, wikipediaPlainText } from "@/lib/api/wikipedia/sanitize";
import type { StyleContextInput } from "@/lib/artwork/style-context";
import { jsonResponse, wikipediaFixtureFetch } from "./helpers";

const base: StyleContextInput = {
  source: "aic",
  sourceLabel: "Art Institute of Chicago",
  alternateStyles: [],
  subjects: [],
  tags: [],
};

const options = {
  urlTemplate: "https://{lang}.wikipedia.org",
  userAgent: "ArtExplorerTest/1.0",
  timeoutMs: 1000,
};

describe("WikipediaStyleProvider", () => {
  it("prefers Russian Wikipedia via the English article's language link (high confidence)", async () => {
    const calls: string[] = [];
    const provider = new WikipediaStyleProvider({
      ...options,
      fetchImpl: wikipediaFixtureFetch(calls),
    });
    const { context, wikipediaUnavailable } = await provider.getStyleContext({
      ...base,
      style: "Impressionism",
    });
    expect(wikipediaUnavailable).toBe(false);
    expect(context).toMatchObject({
      kind: "style",
      primaryLabel: "Impressionism",
      sourceLanguage: "ru",
      wikipediaTitle: "Импрессионизм",
      confidence: "high",
      referenceStatus: "found",
    });
    expect(context?.sourceUrl).toMatch(/^https:\/\/ru\.wikipedia\.org\/wiki\//);
    expect(context?.museumEvidence).toEqual([
      { field: "style", value: "Impressionism", source: "Art Institute of Chicago" },
    ]);
    expect(
      calls.some((url) => url.startsWith("https://ru.wikipedia.org/api/rest_v1/page/summary/")),
    ).toBe(true);
  });

  it("falls back to English when no Russian article exists", async () => {
    const provider = new WikipediaStyleProvider({ ...options, fetchImpl: wikipediaFixtureFetch() });
    const { context } = await provider.getStyleContext({
      ...base,
      source: "cma",
      sourceLabel: "Cleveland Museum of Art",
      artistName: "Claude Monet",
      artistDisplay: "Claude Monet (French, 1840–1926)",
    });
    expect(context).toMatchObject({
      kind: "artist",
      sourceLanguage: "en",
      wikipediaTitle: "Claude Monet",
      confidence: "low",
    });
    expect(context?.sourceUrl).toBe("https://en.wikipedia.org/wiki/Claude_Monet");
  });

  it("rejects namesakes whose years do not match the museum record", async () => {
    const provider = new WikipediaStyleProvider({ ...options, fetchImpl: wikipediaFixtureFetch() });
    const { context } = await provider.getStyleContext({
      ...base,
      artistName: "Claude Monet",
      artistDisplay: "Claude Monet (American, 1950–2010)",
    });
    expect(context).toBeNull();
  });

  it("rejects irrelevant results (a film with a similar title)", async () => {
    const provider = new WikipediaStyleProvider({ ...options, fetchImpl: wikipediaFixtureFetch() });
    const { context } = await provider.getStyleContext({ ...base, style: "Cubism" });
    // The museum style is still shown, but without the unrelated article.
    expect(context).toMatchObject({
      primaryLabel: "Cubism",
      referenceStatus: "not-found",
      confidence: "medium",
    });
    expect(context?.summary).toBeUndefined();
    expect(context?.sourceName).toBe("Art Institute of Chicago");
  });

  it("uses technique context when nothing else is known", async () => {
    const provider = new WikipediaStyleProvider({ ...options, fetchImpl: wikipediaFixtureFetch() });
    const { context } = await provider.getStyleContext({ ...base, medium: "Oil on canvas" });
    expect(context).toMatchObject({
      kind: "technique",
      wikipediaTitle: "Oil painting",
      confidence: "low",
    });
    expect(context?.museumEvidence[0]).toMatchObject({ field: "medium", value: "Oil on canvas" });
  });

  it("returns null when there is no museum basis", async () => {
    const calls: string[] = [];
    const provider = new WikipediaStyleProvider({
      ...options,
      fetchImpl: wikipediaFixtureFetch(calls),
    });
    await expect(provider.getStyleContext(base)).resolves.toEqual({
      context: null,
      wikipediaUnavailable: false,
    });
    expect(calls).toHaveLength(0);
  });

  it.each([
    ["429", 429],
    ["500", 500],
    ["503", 503],
  ])("degrades gracefully on HTTP %s", async (_label, status) => {
    const provider = new WikipediaStyleProvider({
      ...options,
      fetchImpl: async () => jsonResponse({}, status),
    });
    const { context, wikipediaUnavailable } = await provider.getStyleContext({
      ...base,
      style: "Impressionism",
    });
    expect(wikipediaUnavailable).toBe(true);
    expect(context).toMatchObject({
      primaryLabel: "Impressionism",
      referenceStatus: "unavailable",
    });
    expect(context?.summary).toBeUndefined();
  });

  it("treats 404 as 'not found', not as an outage", async () => {
    const provider = new WikipediaStyleProvider({
      ...options,
      fetchImpl: async () => jsonResponse({}, 404),
    });
    const result = await provider.getStyleContext({ ...base, style: "Impressionism" });
    expect(result.wikipediaUnavailable).toBe(false);
    expect(result.context?.referenceStatus).toBe("not-found");
  });

  it("degrades gracefully on timeout and invalid JSON", async () => {
    const hanging: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      );
    const slow = new WikipediaStyleProvider({ ...options, timeoutMs: 50, fetchImpl: hanging });
    expect(
      (await slow.getStyleContext({ ...base, artistName: "Claude Monet" })).wikipediaUnavailable,
    ).toBe(true);

    const broken = new WikipediaStyleProvider({
      ...options,
      fetchImpl: async () => new Response("<html>", { status: 200 }),
    });
    expect(
      (await broken.getStyleContext({ ...base, style: "Impressionism" })).context?.referenceStatus,
    ).toBe("unavailable");
  });

  it("sends an identifying User-Agent", async () => {
    let headers: HeadersInit | undefined;
    const provider = new WikipediaStyleProvider({
      ...options,
      fetchImpl: async (input, init) => {
        headers = init?.headers;
        return wikipediaFixtureFetch()(input, init);
      },
    });
    await provider.getStyleContext({ ...base, style: "Impressionism" });
    expect(headers).toMatchObject({
      "User-Agent": "ArtExplorerTest/1.0",
      "Api-User-Agent": "ArtExplorerTest/1.0",
    });
  });
});

describe("relevance rules", () => {
  it("matches exact titles, redirects and art qualifiers only", () => {
    expect(titleMatchesTerm({ title: "Impressionism" }, "impressionism")).toBe(true);
    expect(titleMatchesTerm({ title: "Mannerism (art)" }, "Mannerism")).toBe(true);
    expect(
      titleMatchesTerm({ title: "Impressionism", matched_title: "Impressionist" }, "Impressionist"),
    ).toBe(true);
    expect(titleMatchesTerm({ title: "Cubism (film)" }, "Cubism")).toBe(false);
    expect(titleMatchesTerm({ title: "Impressionism in music" }, "Impressionism")).toBe(false);
  });

  it("rejects disambiguation pages and unrelated entities", () => {
    expect(
      isRelevantArticle({
        kind: "style",
        summary: { type: "disambiguation", description: "art", extract: "art" },
      }),
    ).toBe(false);
    expect(
      isRelevantArticle({
        kind: "style",
        summary: { type: "standard", description: "2004 film", extract: "A film about art" },
      }),
    ).toBe(false);
    expect(
      isRelevantArticle({
        kind: "style",
        summary: { type: "standard", description: "art movement", extract: "…" },
      }),
    ).toBe(true);
    expect(
      isRelevantArticle({
        kind: "artist",
        summary: { type: "standard", description: "French footballer", extract: "born 1990" },
      }),
    ).toBe(false);
  });
});

describe("summary normalization and sanitizing", () => {
  it("truncates long summaries at a sentence boundary", () => {
    const sentence = "Это предложение о живописи и её истории. ";
    const article = normalizeSummary(
      {
        type: "standard",
        title: "T",
        extract: sentence.repeat(60),
        content_urls: { desktop: { page: "https://ru.wikipedia.org/wiki/T" } },
      },
      "ru",
      "https://ru.wikipedia.org/wiki/T",
      300,
    );
    expect(article!.extract.length).toBeLessThanOrEqual(300);
    expect(article!.extract.endsWith(".")).toBe(true);
  });

  it("ignores non-Wikipedia content URLs", () => {
    const article = normalizeSummary(
      {
        type: "standard",
        title: "T",
        extract: "Text",
        content_urls: { desktop: { page: "https://evil.example/x" } },
      },
      "en",
      "https://en.wikipedia.org/wiki/T",
    );
    expect(article?.url).toBe("https://en.wikipedia.org/wiki/T");
  });

  it("sanitizes HTML with a strict allowlist", () => {
    const html =
      '<p onclick="x()">Hi <b>bold</b> <a href="javascript:alert(1)">bad</a> <a href="https://ok.org">ok</a></p><script>alert(1)</script><table><tr><td>t</td></tr></table><iframe src="https://x"></iframe><img src=x onerror=alert(1)><style>p{}</style><form><input></form>';
    const clean = sanitizeWikipediaHtml(html);
    expect(clean).not.toMatch(
      /script|onclick|javascript:|<table|<iframe|<img|onerror|<style|<form|<input/i,
    );
    expect(clean).toContain("<strong>bold</strong>");
    expect(clean).toContain('href="https://ok.org"');
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
  });

  it("prefers plain text extracts", () => {
    expect(wikipediaPlainText("Plain &amp; simple")).toBe("Plain & simple");
    expect(wikipediaPlainText(null, "<p>From <b>HTML</b></p><script>x</script>")).toBe("From HTML");
  });
});
