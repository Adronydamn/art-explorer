import type { StyleProvider } from "@/lib/api/providers/style-provider";
import { logServerError } from "@/lib/api/http";
import {
  buildStyleCandidates,
  buildStyleContext,
  type ContextArticle,
  type StyleCandidate,
  type StyleContextInput,
} from "@/lib/artwork/style-context";
import type { StyleContextResult } from "@/lib/artwork/types";
import { WikipediaClient, type WikipediaClientOptions } from "./client";
import {
  describesArtMovement,
  extractYears,
  isRelevantArticle,
  normalizeSummary,
  titleMatchesTerm,
} from "./normalize";
import type { WikiLanguage, WikiSummaryRaw } from "./schemas";
import { getLanguageLinks, searchTitles } from "./search";
import { getSummary } from "./summary";

type Lookup =
  | { status: "found"; article: ContextArticle }
  | { status: "not-found" }
  | { status: "unavailable" };

const CYRILLIC = /[\u0400-\u04FF]/;
/** Maximum number of candidates checked per artwork, to bound external requests. */
const MAX_CANDIDATES = 5;

export class WikipediaStyleProvider implements StyleProvider {
  private readonly client: WikipediaClient;

  constructor(options: WikipediaClientOptions = {}) {
    this.client = new WikipediaClient(options);
  }

  get wikipediaClient(): WikipediaClient {
    return this.client;
  }

  async getStyleContext(
    input: StyleContextInput,
    options: { signal?: AbortSignal } = {},
  ): Promise<StyleContextResult> {
    const candidates = buildStyleCandidates(input).slice(0, MAX_CANDIDATES);
    let unavailable = false;

    for (const candidate of candidates) {
      const lookup = await this.lookup(candidate, input, options.signal);
      if (lookup.status === "unavailable") unavailable = true;

      if (lookup.status === "found") {
        return {
          context: buildStyleContext(candidate, lookup.article, "found"),
          wikipediaUnavailable: false,
        };
      }
      // A style/period stated by the museum is always shown, even without a reference article.
      if (candidate.basis === "explicit") {
        return {
          context: buildStyleContext(candidate, null, lookup.status),
          wikipediaUnavailable: lookup.status === "unavailable",
        };
      }
    }
    return { context: null, wikipediaUnavailable: unavailable };
  }

  private async lookup(
    candidate: StyleCandidate,
    input: StyleContextInput,
    signal?: AbortSignal,
  ): Promise<Lookup> {
    try {
      for (const term of candidate.searchTerms) {
        const article = await this.findArticle(term, candidate, input, signal);
        if (article) return { status: "found", article };
      }
      return { status: "not-found" };
    } catch (error) {
      if (signal?.aborted) throw error;
      logServerError(`wikipedia:${candidate.kind}`, error);
      return { status: "unavailable" };
    }
  }

  private accept(
    candidate: StyleCandidate,
    input: StyleContextInput,
    summary: WikiSummaryRaw,
  ): boolean {
    const relevant = isRelevantArticle({
      kind: candidate.kind,
      summary,
      artistYears: candidate.kind === "artist" ? extractYears(input.artistDisplay) : undefined,
    });
    if (!relevant) return false;
    return candidate.basis !== "corroborated" || describesArtMovement(summary);
  }

  /**
   * ru.wikipedia is preferred. Museum vocabulary is English, so the English article is located
   * first, validated, and then its Russian interlanguage link is used when it exists.
   */
  private async findArticle(
    term: string,
    candidate: StyleCandidate,
    input: StyleContextInput,
    signal?: AbortSignal,
  ): Promise<ContextArticle | null> {
    if (CYRILLIC.test(term)) {
      return this.findInLanguage("ru", term, candidate, input, signal);
    }

    const english = await this.findInLanguage("en", term, candidate, input, signal);
    if (!english) return null;

    const links = await getLanguageLinks(this.client, "en", english.title, signal);
    const russianTitle = links.find((link) => link.code === "ru")?.title;
    if (russianTitle) {
      const russian = await getSummary(this.client, "ru", russianTitle, signal);
      if (russian && russian.type === "standard") {
        const article = normalizeSummary(
          russian,
          "ru",
          this.client.articleUrl("ru", russian.title),
        );
        if (article) return article;
      }
    }
    return english;
  }

  private async findInLanguage(
    lang: WikiLanguage,
    term: string,
    candidate: StyleCandidate,
    input: StyleContextInput,
    signal?: AbortSignal,
  ): Promise<ContextArticle | null> {
    const pages = await searchTitles(this.client, lang, term, 5, signal);
    const page = pages.find((hit) => titleMatchesTerm(hit, term));
    if (!page) return null;
    const summary = await getSummary(this.client, lang, page.title, signal);
    if (!summary || !this.accept(candidate, input, summary)) return null;
    return normalizeSummary(summary, lang, this.client.articleUrl(lang, summary.title));
  }
}
