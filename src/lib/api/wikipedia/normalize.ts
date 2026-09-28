import type { StyleContextKind } from "@/lib/artwork/types";
import { normalizeForMatch, truncateText } from "@/lib/utils/text";
import { wikipediaPlainText } from "./sanitize";
import type { WikiLanguage, WikiSearchPage, WikiSummaryRaw } from "./schemas";

export const DETAIL_SUMMARY_LIMIT = 1200;

export type WikiArticle = {
  title: string;
  lang: WikiLanguage;
  url: string;
  description?: string;
  extract: string;
};

export function normalizeSummary(
  raw: WikiSummaryRaw,
  lang: WikiLanguage,
  fallbackUrl: string,
  maxLength = DETAIL_SUMMARY_LIMIT,
): WikiArticle | null {
  const extract = wikipediaPlainText(raw.extract, raw.extract_html);
  if (!extract) return null;
  const url = raw.content_urls?.desktop?.page;
  return {
    title: raw.title,
    lang,
    url: url && /^https:\/\/[a-z]{2,3}\.(m\.)?wikipedia\.org\//.test(url) ? url : fallbackUrl,
    description: raw.description?.trim() || undefined,
    extract: truncateText(extract, maxLength),
  };
}

/** Parenthetical qualifiers that keep a title about the same art concept, e.g. "Mannerism (art)". */
const ALLOWED_QUALIFIERS = new Set([
  "art",
  "arts",
  "painting",
  "visual arts",
  "art movement",
  "style",
  "painter",
  "artist",
  "art period",
  "живопись",
  "искусство",
  "художник",
  "живописец",
  "стиль",
  "направление",
]);

/**
 * True when a search hit is about exactly the museum term: identical title, identical redirect
 * source (`matched_title`) or the same title with an art-related disambiguation qualifier.
 */
export function titleMatchesTerm(
  page: Pick<WikiSearchPage, "title" | "matched_title">,
  term: string,
): boolean {
  const wanted = normalizeForMatch(term);
  if (!wanted) return false;
  const candidates = [page.title, page.matched_title].filter((value): value is string =>
    Boolean(value),
  );
  return candidates.some((candidate) => {
    const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(candidate);
    if (normalizeForMatch(candidate) === wanted) return true;
    return Boolean(
      match &&
      normalizeForMatch(match[1] ?? "") === wanted &&
      ALLOWED_QUALIFIERS.has(normalizeForMatch(match[2] ?? "")),
    );
  });
}

const KIND_KEYWORDS: Record<StyleContextKind, RegExp> = {
  style:
    /\b(art|arts|artistic|movement|style|painting|painters?|architecture|avant[- ]garde|school)\b|искусств|художеств|течени|направлени|стил|живопис/i,
  period:
    /\b(art|period|era|age|century|dynasty|culture|history|movement|style)\b|период|эпох|век|династ|искусств|культур|стил/i,
  artist:
    /\b(painter|artist|sculptor|printmaker|draughtsman|illustrator)\b|художни|живопис|скульптор|график/i,
  technique:
    /\b(paint|painting|technique|medium|pigment|binder|art)\b|живопис|техник|краск|пигмент/i,
  genre: /\b(genre|painting|art|subject)\b|жанр|живопис|искусств/i,
  culture: /\b(art|arts|culture|artistic|painting)\b|искусств|культур|живопис/i,
};

/** Descriptions of entities that must never be used as art context. */
const UNRELATED_ENTITY =
  /\b(film|movie|novel|album|song|single|band|television|tv series|video game|city|town|village|commune|municipality|river|footballer|politician|company|magazine|newspaper)\b|фильм|роман|альбом|песн|сериал|город|село|деревн|коммун|реке|река|футбол|политик|компани|журнал|газет/i;

export type RelevanceInput = {
  kind: StyleContextKind;
  summary: Pick<WikiSummaryRaw, "type" | "description" | "extract">;
  /** Four-digit years from the museum's artist display (birth/death) used to rule out namesakes. */
  artistYears?: number[];
};

/**
 * Validates that a Wikipedia article describes the kind of concept the museum stated.
 * Rejects disambiguation pages, unrelated entities (films, cities, …) and namesakes.
 */
export function isRelevantArticle({ kind, summary, artistYears = [] }: RelevanceInput): boolean {
  if (summary.type !== "standard") return false;
  const description = summary.description ?? "";
  const text = `${description} ${(summary.extract ?? "").slice(0, 600)}`;
  if (!KIND_KEYWORDS[kind].test(text)) return false;

  if (kind === "artist") {
    const [birthYear] = artistYears;
    return birthYear === undefined || text.includes(String(birthYear));
  }
  return !UNRELATED_ENTITY.test(description);
}

/** Does the article describe an art movement / style (used for tag-based, medium confidence)? */
export function describesArtMovement(
  summary: Pick<WikiSummaryRaw, "description" | "extract">,
): boolean {
  const text = `${summary.description ?? ""} ${(summary.extract ?? "").slice(0, 300)}`;
  return /\b(art movement|artistic movement|movement in (painting|art)|style of (painting|art)|artistic style|school of painting)\b|художественн\w* (течение|направление|стиль)|направление в (живописи|искусстве)|течение в (живописи|искусстве)/i.test(
    text,
  );
}

export function extractYears(value: string | undefined): number[] {
  if (!value) return [];
  return [...value.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)].map((match) => Number(match[1]));
}
