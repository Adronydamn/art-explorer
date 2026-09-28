import type { Artwork, ArtworkImage, ArtworkSummary } from "@/lib/artwork/types";
import { SOURCE_LABELS } from "@/lib/artwork/types";
import { isMeaningfulTag, matchGenre } from "@/lib/artwork/vocabulary";
import { looksLikeHtml, sanitizeHtml } from "@/lib/security/sanitize";
import { capitalizeFirst, cleanText, stripHtml, uniqueStrings } from "@/lib/utils/text";
import { selectCmaImage } from "./image";
import type { CmaArtworkRecord, CmaCreator } from "./schemas";

const UNTITLED = "Без названия";

type ParsedCreators = { name?: string; display?: string };

/**
 * CMA creators look like `{ description: "Claude Monet (French, 1840–1926)", role: "artist" }`.
 * Some records have several creators, qualifiers ("workshop of") or no description at all.
 */
export function parseCmaCreators(
  creators: readonly CmaCreator[] | null | undefined,
): ParsedCreators {
  const valid = (creators ?? []).filter((creator) => cleanText(creator.description));
  if (valid.length === 0) return {};
  const displays = valid.map((creator) => {
    const description = cleanText(creator.description) ?? "";
    const qualifier = cleanText(creator.qualifier);
    return qualifier ? `${qualifier} ${description}` : description;
  });
  const names = valid.map((creator) => {
    const description = cleanText(creator.description) ?? "";
    const name = description.replace(/\s*\(.*$/s, "").trim();
    return name || description;
  });
  return { name: uniqueStrings(names).join(", "), display: uniqueStrings(displays).join("\n") };
}

export function cmaRights(status: string | null | undefined): {
  isPublicDomain?: boolean;
  statement?: string;
  imageRights?: string;
} {
  const value = cleanText(status);
  if (!value) return {};
  if (value.toUpperCase() === "CC0") {
    return {
      isPublicDomain: true,
      statement: "Открытый доступ: музей публикует изображение и данные по лицензии CC0.",
      imageRights: "CC0 (открытый доступ)",
    };
  }
  if (/copyright/i.test(value)) {
    return {
      isPublicDomain: false,
      statement: "Произведение защищено авторским правом (по данным музея).",
    };
  }
  return { statement: `Статус прав по данным музея: ${value}` };
}

function cultureValue(culture: CmaArtworkRecord["culture"]): string | undefined {
  if (Array.isArray(culture)) return uniqueStrings(culture).join("; ") || undefined;
  return cleanText(culture);
}

function fallbackAlt(title: string, artist?: string): string {
  return artist ? `«${title}», ${artist}` : `«${title}»`;
}

export function cmaWebsiteUrl(
  record: Pick<CmaArtworkRecord, "url" | "accession_number" | "id">,
): string {
  const url = cleanText(record.url);
  if (url?.startsWith("https://")) return url;
  const accession = cleanText(record.accession_number);
  return accession
    ? `https://clevelandart.org/art/${encodeURIComponent(accession)}`
    : `https://clevelandart.org/art/collection/search?search=${record.id}`;
}

function normalizeImage(
  record: CmaArtworkRecord,
  title: string,
  artist?: string,
): ArtworkImage | undefined {
  const selected = selectCmaImage(record.images);
  if (!selected) return undefined;
  return {
    ...selected,
    alt: fallbackAlt(title, artist),
    rights: cmaRights(record.share_license_status).imageRights,
  };
}

export function normalizeCmaSummary(record: CmaArtworkRecord): ArtworkSummary {
  const title = cleanText(record.title) ?? UNTITLED;
  const { name } = parseCmaCreators(record.creators);
  const image = normalizeImage(record, title, name);
  return {
    id: String(record.id),
    source: "cma",
    sourceLabel: SOURCE_LABELS.cma,
    sourceUrl: cmaWebsiteUrl(record),
    title,
    artistName: name,
    dateDisplay: cleanText(record.creation_date),
    isPublicDomain: cmaRights(record.share_license_status).isPublicDomain,
    image: image && {
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
      alt: image.alt,
      width: image.width,
      height: image.height,
    },
  };
}

function textField(value: string | null | undefined): string | undefined {
  const text = cleanText(value);
  return text ? cleanText(stripHtml(text)) : undefined;
}

function joinLines(values: ReadonlyArray<string | null | undefined>): string | undefined {
  const lines = uniqueStrings(values.map((value) => (value ? stripHtml(value) : value)));
  return lines.length > 0 ? lines.join("\n") : undefined;
}

export function normalizeCmaArtwork(record: CmaArtworkRecord): Artwork {
  const summary = normalizeCmaSummary(record);
  const { display } = parseCmaCreators(record.creators);
  const rights = cmaRights(record.share_license_status);
  const descriptionRaw = cleanText(record.description);
  const tags = uniqueStrings(record.tags ?? []).filter(isMeaningfulTag);
  const genre = matchGenre(tags);
  const copyright = cleanText(record.copyright);

  return {
    ...summary,
    apiUrl: `https://openaccess-api.clevelandart.org/api/artworks/${record.id}`,
    image: normalizeImage(record, summary.title, summary.artistName),
    artistDisplay: display,
    dateStart: record.creation_date_earliest ?? undefined,
    dateEnd: record.creation_date_latest ?? undefined,
    rightsStatement: copyright ? `${rights.statement ?? ""} ${copyright}`.trim() : rights.statement,
    description: descriptionRaw
      ? looksLikeHtml(descriptionRaw)
        ? { content: sanitizeHtml(descriptionRaw), format: "html" }
        : { content: descriptionRaw, format: "text" }
      : undefined,
    commentary: textField(record.wall_description),
    didYouKnow: textField(record.did_you_know),
    provenance: joinLines((record.provenance ?? []).map((item) => item.description)),
    publicationHistory: joinLines(
      (record.citations ?? []).map((item) =>
        item.citation ? [item.citation, item.page_number].filter(Boolean).join(". ") : null,
      ),
    ),
    exhibitionHistory: joinLines(
      (record.exhibitions?.current ?? []).map((item) => item.description ?? item.title),
    ),
    textLicense: descriptionRaw
      ? "Текст описания © Cleveland Museum of Art (открытые данные, CC0)."
      : undefined,
    alternateStyles: [],
    period: cleanText(record.period),
    artworkType: record.type ? capitalizeFirst(record.type) : undefined,
    genre: genre?.museumValue,
    subjects: [],
    tags,
    medium: cleanText(record.technique),
    dimensions: cleanText(record.measurements),
    department: cleanText(record.department),
    collection: cleanText(record.collection),
    gallery: cleanText(record.current_location),
    culture: cultureValue(record.culture),
    creditLine: cleanText(record.creditline),
    accessionNumber: cleanText(record.accession_number),
    inscriptions: uniqueStrings(
      (record.inscriptions ?? []).map((item) =>
        item.inscription_translation
          ? `${item.inscription ?? ""} (перевод музея: ${item.inscription_translation})`
          : item.inscription,
      ),
    ),
    rawMetadata: record as Record<string, unknown>,
  };
}
