import type { ArtworkSummary, RelatedArtwork, RelatedReason } from "./types";

export const MAX_RELATED = 6;

export const RELATED_REASON_LABELS: Record<RelatedReason, string> = {
  artist: "Тот же автор",
  style: "Тот же стиль",
  period: "Тот же период",
  genre: "Тот же жанр",
  tags: "Похожие темы",
  technique: "Та же техника",
};

/**
 * Combines related-work groups in priority order (artist → style → …), removes the current work
 * and duplicates, and keeps at most MAX_RELATED items. Every item carries the museum-based reason.
 */
export function combineRelated(
  currentKey: string,
  groups: ReadonlyArray<{ reason: RelatedReason; items: readonly ArtworkSummary[] }>,
  limit = MAX_RELATED,
): RelatedArtwork[] {
  const seen = new Set<string>([currentKey]);
  const result: RelatedArtwork[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const key = `${item.source}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...item, reason: group.reason });
      if (result.length >= limit) return result;
    }
  }
  return result;
}
