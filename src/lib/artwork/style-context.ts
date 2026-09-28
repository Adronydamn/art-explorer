import type {
  Artwork,
  MuseumEvidence,
  StyleContext,
  StyleContextKind,
  StyleMatchConfidence,
} from "./types";
import { isMeaningfulTag, matchGenre, matchTechnique } from "./vocabulary";

/** Museum fields that the style context logic may read. */
export type StyleContextInput = Pick<
  Artwork,
  | "source"
  | "sourceLabel"
  | "style"
  | "alternateStyles"
  | "period"
  | "classification"
  | "artworkType"
  | "genre"
  | "subjects"
  | "tags"
  | "artistName"
  | "artistDisplay"
  | "medium"
  | "culture"
  | "placeOfOrigin"
>;

export type CandidateBasis = "explicit" | "corroborated" | "reference";

export type StyleCandidate = {
  kind: StyleContextKind;
  /** Museum value as stated in the catalogue. */
  museumValue: string;
  /** Article titles to look up (English museum vocabulary). */
  searchTerms: string[];
  basis: CandidateBasis;
  evidence: MuseumEvidence[];
  relatedTerms: string[];
};

const FIELD_LABELS: Record<string, string> = {
  style: "Стиль",
  alternateStyles: "Дополнительные стили",
  period: "Период",
  classification: "Классификация",
  artworkType: "Тип произведения",
  genre: "Жанр (тема по каталогу)",
  tags: "Тематические теги",
  artistName: "Автор",
  medium: "Материалы и техника",
  culture: "Культура",
  placeOfOrigin: "Место создания",
};

export function evidenceLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function evidence(
  input: StyleContextInput,
  field: keyof typeof FIELD_LABELS,
  value: string | undefined,
): MuseumEvidence[] {
  return value ? [{ field, value, source: input.sourceLabel }] : [];
}

/** "Edo period (1615–1868)" → "Edo period" */
export function cleanPeriod(period: string): string {
  return period.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function isPainting(input: StyleContextInput): boolean {
  return /paint|живопис/i.test(`${input.classification ?? ""} ${input.artworkType ?? ""}`);
}

/**
 * Builds lookup candidates strictly from museum metadata, in the priority order:
 * style → period → corroborated movement tags → artist → genre → technique → culture.
 * Nothing is inferred from the image or from the artwork title.
 */
export function buildStyleCandidates(input: StyleContextInput): StyleCandidate[] {
  const candidates: StyleCandidate[] = [];
  const classificationEvidence = [
    ...evidence(input, "classification", input.classification),
    ...evidence(input, "artworkType", input.artworkType),
  ];

  if (input.style) {
    candidates.push({
      kind: "style",
      museumValue: input.style,
      searchTerms: [input.style],
      basis: "explicit",
      evidence: [
        ...evidence(input, "style", input.style),
        ...evidence(input, "period", input.period),
      ],
      relatedTerms: input.alternateStyles,
    });
    return candidates;
  }

  if (input.period) {
    const period = cleanPeriod(input.period);
    candidates.push({
      kind: "period",
      museumValue: input.period,
      searchTerms: [period],
      basis: "explicit",
      evidence: [...evidence(input, "period", input.period), ...classificationEvidence],
      relatedTerms: [],
    });
    return candidates;
  }

  // Medium confidence: a museum tag / secondary style that is corroborated by other museum fields.
  const genreValue = input.genre?.toLowerCase();
  const subjects = new Set(input.subjects.map((subject) => subject.toLowerCase()));
  const movementTags = [...input.alternateStyles, ...input.tags]
    .filter(
      (tag) =>
        isMeaningfulTag(tag) &&
        tag.toLowerCase() !== genreValue &&
        !subjects.has(tag.toLowerCase()),
    )
    .filter((tag) => /^[\p{Lu}]/u.test(tag) && !/\d/.test(tag))
    .slice(0, 2);
  if (isPainting(input)) {
    for (const tag of movementTags) {
      const fromAlternate = input.alternateStyles.includes(tag);
      candidates.push({
        kind: "style",
        museumValue: tag,
        searchTerms: [tag],
        basis: "corroborated",
        evidence: [
          ...(fromAlternate
            ? evidence(input, "alternateStyles", tag)
            : evidence(input, "tags", tag)),
          ...classificationEvidence,
        ],
        relatedTerms: [],
      });
    }
  }

  if (input.artistName && !/^(unknown|anonymous|неизвестн)/i.test(input.artistName)) {
    const artist = input.artistName.split(",")[0]?.trim() ?? input.artistName;
    candidates.push({
      kind: "artist",
      museumValue: artist,
      searchTerms: [artist],
      basis: "reference",
      evidence: evidence(
        input,
        "artistName",
        input.artistDisplay?.split("\n")[0] ?? input.artistName,
      ),
      relatedTerms: [],
    });
  }

  const genre = input.genre ? matchGenre([input.genre]) : undefined;
  if (genre) {
    candidates.push({
      kind: "genre",
      museumValue: genre.museumValue,
      searchTerms: [genre.article],
      basis: "reference",
      evidence: evidence(input, "genre", genre.museumValue),
      relatedTerms: [],
    });
  }

  const technique = matchTechnique(input.medium);
  if (technique) {
    candidates.push({
      kind: "technique",
      museumValue: technique.museumValue,
      searchTerms: [technique.article],
      basis: "reference",
      evidence: evidence(input, "medium", technique.museumValue),
      relatedTerms: [],
    });
  }

  const cultureValue = input.culture ?? input.placeOfOrigin;
  const place = cultureValue?.split(/[,;]/)[0]?.trim();
  if (cultureValue && place && /^[\p{L} .'-]{3,40}$/u.test(place)) {
    candidates.push({
      kind: "culture",
      museumValue: cultureValue,
      searchTerms: [`Art of ${place}`],
      basis: "reference",
      evidence: input.culture
        ? evidence(input, "culture", input.culture)
        : evidence(input, "placeOfOrigin", input.placeOfOrigin),
      relatedTerms: [],
    });
  }

  return candidates;
}

/**
 * Confidence rules:
 * - high: the museum explicitly states style/period AND a matching Wikipedia article was found;
 * - medium: explicit museum style/period without an article, or a movement tag corroborated by
 *   several museum fields with a matching article;
 * - low: only author / technique / genre / culture reference material.
 */
export function confidenceFor(
  candidate: StyleCandidate,
  articleFound: boolean,
): StyleMatchConfidence {
  if (candidate.basis === "explicit") return articleFound ? "high" : "medium";
  if (candidate.basis === "corroborated")
    return candidate.evidence.length >= 2 && articleFound ? "medium" : "low";
  return "low";
}

export type ContextArticle = {
  title: string;
  lang: "ru" | "en";
  url: string;
  description?: string;
  extract: string;
};

const LANGUAGE_NAMES = { ru: "русская", en: "английская" } as const;

export function wikipediaAttribution(article: ContextArticle): string {
  return `Текст: Wikipedia (${LANGUAGE_NAMES[article.lang]} версия), статья «${article.title}». Лицензия CC BY-SA 4.0.`;
}

export function buildStyleContext(
  candidate: StyleCandidate,
  article: ContextArticle | null,
  referenceStatus: StyleContext["referenceStatus"],
): StyleContext {
  if (candidate.evidence.length === 0) {
    throw new Error("Style context requires museum evidence");
  }
  const museumSource = candidate.evidence[0]?.source ?? "Art Institute of Chicago";
  return {
    primaryLabel: candidate.museumValue,
    kind: candidate.kind,
    summary: article?.extract,
    characteristics: article?.description ? [article.description] : [],
    relatedTerms: candidate.relatedTerms,
    sourceName: article ? "Wikipedia" : museumSource,
    sourceUrl: article?.url,
    sourceLanguage: article?.lang,
    wikipediaTitle: article?.title,
    confidence: confidenceFor(candidate, Boolean(article)),
    attribution: article ? wikipediaAttribution(article) : `Данные: ${museumSource}.`,
    museumEvidence: candidate.evidence,
    referenceStatus,
  };
}

/** Section heading depending on what the museum confirmed. */
export function contextHeading(context: StyleContext | null): string {
  if (!context) return "Контекст";
  if (context.kind === "style")
    return context.confidence === "low" ? "Дополнительный контекст" : "Стиль и контекст";
  if (context.kind === "period") return "Исторический контекст";
  if (context.kind === "artist") return "Контекст об авторе";
  if (context.kind === "technique" || context.kind === "genre") return "Техника и жанр";
  return "Культурный контекст";
}

/** Only high / medium contexts may present the museum term as a stylistic classification. */
export function canClaimStyle(context: StyleContext | null): boolean {
  return Boolean(
    context &&
    (context.kind === "style" || context.kind === "period") &&
    context.confidence !== "low",
  );
}
