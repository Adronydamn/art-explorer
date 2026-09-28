import { normalizeForMatch } from "@/lib/utils/text";

/**
 * Deterministic mappings from museum vocabulary to encyclopedic article titles.
 * They never infer anything the museum did not state: the input is always a museum field value.
 */

type VocabularyEntry = { patterns: RegExp[]; article: string; label: string };

const GENRES: VocabularyEntry[] = [
  { patterns: [/\blandscapes?\b/], article: "Landscape painting", label: "Пейзаж" },
  { patterns: [/\bself portraits?\b/], article: "Self-portrait", label: "Автопортрет" },
  { patterns: [/\bportraits?\b/], article: "Portrait painting", label: "Портрет" },
  {
    patterns: [/\bstill lifes?\b/, /\bstill life paintings?\b/],
    article: "Still life",
    label: "Натюрморт",
  },
  {
    patterns: [/\bseascapes?\b/, /\bmarine paintings?\b/, /\bmarines\b/],
    article: "Marine art",
    label: "Марина",
  },
  {
    patterns: [/\bgenre scenes?\b/, /\bgenre paintings?\b/],
    article: "Genre painting",
    label: "Жанровая живопись",
  },
  {
    patterns: [/\bhistory paintings?\b/],
    article: "History painting",
    label: "Историческая живопись",
  },
  {
    patterns: [/\bcityscapes?\b/, /\burban landscapes?\b/],
    article: "Cityscape",
    label: "Городской пейзаж",
  },
  { patterns: [/\bnudes?\b/], article: "Nude (art)", label: "Ню" },
];

const TECHNIQUES: VocabularyEntry[] = [
  { patterns: [/\boil\b/], article: "Oil painting", label: "Масляная живопись" },
  { patterns: [/\btempera\b/], article: "Tempera", label: "Темпера" },
  { patterns: [/\bwatercolou?rs?\b/], article: "Watercolor painting", label: "Акварель" },
  { patterns: [/\bgouache\b/], article: "Gouache", label: "Гуашь" },
  { patterns: [/\bfresco\b/], article: "Fresco", label: "Фреска" },
  { patterns: [/\bpastels?\b/], article: "Pastel", label: "Пастель" },
  { patterns: [/\bacrylic\b/], article: "Acrylic painting", label: "Акриловая живопись" },
  { patterns: [/\bencaustic\b/], article: "Encaustic painting", label: "Энкаустика" },
];

export type VocabularyMatch = { museumValue: string; article: string; label: string };

function matchVocabulary(
  values: readonly string[],
  entries: VocabularyEntry[],
): VocabularyMatch | undefined {
  for (const entry of entries) {
    for (const value of values) {
      const normalized = normalizeForMatch(value);
      if (entry.patterns.some((pattern) => pattern.test(normalized))) {
        return { museumValue: value, article: entry.article, label: entry.label };
      }
    }
  }
  return undefined;
}

/** Finds a genre stated in museum subject / term tags. */
export function matchGenre(values: readonly string[]): VocabularyMatch | undefined {
  return matchVocabulary(values, GENRES);
}

/** Maps a museum medium / technique string to a painting technique article. */
export function matchTechnique(medium: string | undefined): VocabularyMatch | undefined {
  return medium ? matchVocabulary([medium], TECHNIQUES) : undefined;
}

/** AIC tags that are generic cataloguing noise rather than meaningful subjects. */
const GENERIC_TAGS = new Set([
  "painting",
  "paintings",
  "paint",
  "canvas",
  "oil paint paint",
  "oil painting",
  "oil paintings visual works",
  "painting image making",
  "painting techniques",
  "organic material",
]);

export function isMeaningfulTag(tag: string): boolean {
  return !GENERIC_TAGS.has(normalizeForMatch(tag));
}
