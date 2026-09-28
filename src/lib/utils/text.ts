const EMPTY_MARKERS = new Set(["", "null", "undefined", "n/a", "unknown", "none", "-", "—"]);

/** Trims a value and converts empty / placeholder strings to undefined. */
export function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  return EMPTY_MARKERS.has(normalized.toLowerCase()) ? undefined : normalized;
}

/** De-duplicates strings case-insensitively, preserving the first spelling. */
export function uniqueStrings(values: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = cleanText(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

/** Removes HTML tags and decodes the most common entities. For plain-text contexts only. */
export function stripHtml(value: string): string {
  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#\d+|#x[\da-f]+|[a-z]+\d*);/gi, (match, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower in ENTITIES) return ENTITIES[lower] ?? match;
      if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
      if (lower.startsWith("#")) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
      return match;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Truncates text to at most `maxLength` characters, preferring a sentence boundary and
 * falling back to a word boundary with an ellipsis.
 */
export function truncateText(value: string, maxLength: number): string {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf(".\n"),
  );
  if (sentenceEnd >= maxLength * 0.5) return slice.slice(0, sentenceEnd + 1).trim();
  const wordEnd = slice.lastIndexOf(" ");
  const cut = wordEnd > maxLength * 0.5 ? slice.slice(0, wordEnd) : slice;
  return `${cut.replace(/[\s,;:.–—-]+$/u, "")}…`;
}

/** Lowercases, removes diacritics / punctuation and collapses whitespace for comparisons. */
export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export type HighlightPart = { text: string; match: boolean };

/**
 * Splits `text` into parts marking case-insensitive occurrences of `query`.
 * Returns plain strings so the UI can render them without HTML injection.
 */
export function splitHighlight(text: string, query: string): HighlightPart[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [{ text, match: false }];
  const haystack = text.toLowerCase();
  const parts: HighlightPart[] = [];
  let cursor = 0;
  let index = haystack.indexOf(needle, cursor);
  while (index !== -1) {
    if (index > cursor) parts.push({ text: text.slice(cursor, index), match: false });
    parts.push({ text: text.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts.length > 0 ? parts : [{ text, match: false }];
}

export function capitalizeFirst(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}
