import type { Artwork, ArtworkSummary, RelatedArtwork } from "@/lib/artwork/types";
import { HOUR, TtlCache } from "@/lib/cache/ttl-cache";
import { getTranslator } from "./index";

const DAY = 24 * HOUR;

const textCache = new TtlCache<string>({
  ttlMs: 30 * DAY,
  maxEntries: 5_000,
});

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cacheKey(text: string, from: string, to: string): string {
  return `${from}:${to}:${text}`;
}

async function translateBatch(texts: string[], from = "en", to = "ru"): Promise<string[]> {
  const trimmed = texts.map((t) => t.trim());
  const indexes = trimmed
    .map((t, i) => ({ original: texts[i], trimmed: t, index: i }))
    .filter((item) => item.trimmed);

  const unique = [...new Set(indexes.map((item) => item.trimmed))];

  const uncachedUnique: string[] = [];
  const cached = new Map<string, string>();
  for (const text of unique) {
    const hit = textCache.get(cacheKey(text, from, to));
    if (hit !== undefined) {
      cached.set(text, hit);
    } else {
      uncachedUnique.push(text);
    }
  }

  if (uncachedUnique.length > 0) {
    try {
      const results = await getTranslator().translate(uncachedUnique, from, to);
      uncachedUnique.forEach((text, i) => {
        const translated = results[i]?.trim() ?? text;
        textCache.set(cacheKey(text, from, to), translated);
        cached.set(text, translated);
      });
    } catch (error) {
      console.error("[artwork-translator] batch translation failed:", error);
      uncachedUnique.forEach((text) => cached.set(text, text));
    }
  }

  return trimmed.map((t, i) => {
    if (!t) return texts[i] ?? "";
    return cached.get(t) ?? texts[i] ?? "";
  });
}

export async function translateMany(texts: string[], from = "en", to = "ru"): Promise<string[]> {
  return translateBatch(texts, from, to);
}

type TranslationSlot = {
  text: string;
  apply: (value: string) => void;
};

function createArrayApply(items: string[], setter: (next: string[]) => void): TranslationSlot[] {
  const slots: TranslationSlot[] = [];
  const copy = [...items];
  copy.forEach((value, index) => {
    if (value?.trim()) {
      slots.push({
        text: value.trim(),
        apply: (translated) => {
          copy[index] = translated;
        },
      });
    }
  });
  slots.push({
    text: "",
    apply: () => setter(copy),
  });
  return slots;
}

function collectFastSlots(artwork: Artwork, slots: TranslationSlot[]): void {
  const add = (text: string | undefined, apply: (value: string) => void) => {
    if (text?.trim()) slots.push({ text: text.trim(), apply });
  };

  add(artwork.title, (value) => (artwork.title = value));
  add(artwork.artistDisplay, (value) => (artwork.artistDisplay = value));
  add(artwork.shortDescription, (value) => (artwork.shortDescription = value));
  add(artwork.style, (value) => (artwork.style = value));
  add(artwork.period, (value) => (artwork.period = value));
  add(artwork.classification, (value) => (artwork.classification = value));
  add(artwork.artworkType, (value) => (artwork.artworkType = value));
  add(artwork.genre, (value) => (artwork.genre = value));
  add(artwork.medium, (value) => (artwork.medium = value));
  add(artwork.department, (value) => (artwork.department = value));
  add(artwork.collection, (value) => (artwork.collection = value));
  add(artwork.gallery, (value) => (artwork.gallery = value));
  add(artwork.culture, (value) => (artwork.culture = value));
  add(artwork.placeOfOrigin, (value) => (artwork.placeOfOrigin = value));
  add(artwork.creditLine, (value) => (artwork.creditLine = value));
  add(artwork.rightsStatement, (value) => (artwork.rightsStatement = value));
  add(artwork.image?.alt, (value) => {
    if (artwork.image) artwork.image.alt = value;
  });

  slots.push(...createArrayApply(artwork.inscriptions, (next) => (artwork.inscriptions = next)));
  slots.push(...createArrayApply(artwork.subjects, (next) => (artwork.subjects = next)));
  slots.push(...createArrayApply(artwork.tags, (next) => (artwork.tags = next)));
  slots.push(
    ...createArrayApply(artwork.alternateStyles, (next) => (artwork.alternateStyles = next)),
  );
}

/** Long museum prose that is loaded after the initial render. */
function collectDetailSlots(artwork: Artwork, slots: TranslationSlot[]): void {
  if (artwork.description?.content.trim()) {
    const original = artwork.description.content;
    slots.push({
      text: stripHtml(original),
      apply: (value) => {
        artwork.description = { content: value, format: "text" };
      },
    });
  }

  const add = (text: string | undefined, apply: (value: string) => void) => {
    if (text?.trim()) slots.push({ text: text.trim(), apply });
  };

  add(artwork.commentary, (value) => (artwork.commentary = value));
  add(artwork.didYouKnow, (value) => (artwork.didYouKnow = value));
  add(artwork.provenance, (value) => (artwork.provenance = value));
  add(artwork.exhibitionHistory, (value) => (artwork.exhibitionHistory = value));
  add(artwork.publicationHistory, (value) => (artwork.publicationHistory = value));
}

async function applySlots(slots: TranslationSlot[], from = "en", to = "ru"): Promise<void> {
  const translatable = slots.filter((slot) => slot.text.trim());
  if (translatable.length === 0) return;

  const translations = await translateMany(translatable.map((slot) => slot.text), from, to);
  translatable.forEach((slot, index) => slot.apply(translations[index] ?? slot.text));

  // Apply deferred array assignments from createArrayApply.
  slots.filter((slot) => !slot.text.trim()).forEach((slot) => slot.apply(""));
}

/** Translates user-facing metadata for immediate render. Long museum prose is left in English. */
export async function localizeArtwork(artwork: Artwork, from = "en", to = "ru"): Promise<Artwork> {
  const localized: Artwork = { ...artwork };
  const slots: TranslationSlot[] = [];
  collectFastSlots(localized, slots);
  await applySlots(slots, from, to);
  return localized;
}

/** Translates the long-form museum prose that is loaded lazily. */
export async function localizeArtworkDetails(artwork: Artwork, from = "en", to = "ru"): Promise<Artwork> {
  const localized: Artwork = { ...artwork };
  const slots: TranslationSlot[] = [];
  collectDetailSlots(localized, slots);
  await applySlots(slots, from, to);
  return localized;
}

/** Translates compact summaries used by search results and related works. */
export async function localizeSummaries(summaries: ArtworkSummary[], from = "en", to = "ru"): Promise<ArtworkSummary[]> {
  const out = summaries.map((summary) => ({ ...summary }));
  const slots: TranslationSlot[] = [];

  const add = (text: string | undefined, apply: (value: string) => void) => {
    if (text?.trim()) slots.push({ text: text.trim(), apply });
  };

  out.forEach((summary) => {
    add(summary.title, (value) => (summary.title = value));
    add(summary.image?.alt, (value) => {
      if (summary.image) summary.image.alt = value;
    });
  });

  if (slots.length === 0) return out;

  const texts = slots.map((slot) => slot.text);
  const translations = await translateBatch(texts, from, to);
  slots.forEach((slot, index) => slot.apply(translations[index] ?? slot.text));
  return out;
}

export async function localizeRelatedArtworks(related: RelatedArtwork[], from = "en", to = "ru"): Promise<RelatedArtwork[]> {
  const summaries = related.map((item) => {
    const { reason, ...summary } = item;
    return { summary, reason };
  });
  const localized = await localizeSummaries(
    summaries.map((s) => s.summary),
    from,
    to,
  );
  return localized.map((summary, i) => ({ ...summary, reason: summaries[i]!.reason }));
}
