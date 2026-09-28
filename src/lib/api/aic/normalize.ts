import type { Artwork, ArtworkImage, ArtworkSummary } from "@/lib/artwork/types";
import { SOURCE_LABELS } from "@/lib/artwork/types";
import { isMeaningfulTag, matchGenre } from "@/lib/artwork/vocabulary";
import { looksLikeHtml, sanitizeHtml } from "@/lib/security/sanitize";
import { cleanText, stripHtml, uniqueStrings } from "@/lib/utils/text";
import { AIC_IMAGE_WIDTHS, buildAicIiifBase, buildAicProxyUrl } from "./image";
import type { AicArtworkRecord, AicConfig } from "./schemas";

const DEFAULT_WEBSITE = "https://www.artic.edu";
const UNTITLED = "Без названия";

export function aicWebsiteUrl(id: number | string, config?: AicConfig): string {
  const base = (cleanText(config?.website_url) ?? DEFAULT_WEBSITE)
    .replace(/^http:\/\//, "https://")
    .replace(/\/+$/, "");
  return `${base}/artworks/${id}`;
}

function fallbackAlt(title: string, artist?: string): string {
  return artist ? `«${title}», ${artist}` : `«${title}»`;
}

export function normalizeAicImage(
  record: Pick<
    AicArtworkRecord,
    "image_id" | "thumbnail" | "title" | "artist_title" | "is_public_domain"
  >,
  config?: AicConfig,
): ArtworkImage | undefined {
  const iiifBase = buildAicIiifBase(record.image_id, config?.iiif_url);
  if (!iiifBase) return undefined;
  const title = cleanText(record.title) ?? UNTITLED;
  const fullWidth = record.thumbnail?.width ?? undefined;
  const fullHeight = record.thumbnail?.height ?? undefined;
  const hasSize =
    typeof fullWidth === "number" &&
    typeof fullHeight === "number" &&
    fullWidth > 0 &&
    fullHeight > 0;
  const detailWidth = hasSize
    ? Math.min(AIC_IMAGE_WIDTHS.detail, fullWidth)
    : AIC_IMAGE_WIDTHS.detail;
  // AIC serves large renditions only for public-domain works; others are limited to 843px.
  const largeWidth = record.is_public_domain ? AIC_IMAGE_WIDTHS.large : AIC_IMAGE_WIDTHS.detail;
  const lqip = cleanText(record.thumbnail?.lqip);

  const imageId = record.image_id!.trim();

  return {
    url: buildAicProxyUrl(imageId, detailWidth),
    thumbnailUrl: buildAicProxyUrl(imageId, AIC_IMAGE_WIDTHS.thumbnail),
    largeUrl: buildAicProxyUrl(imageId, hasSize ? Math.min(largeWidth, fullWidth) : largeWidth),
    iiifUrl: iiifBase,
    width: hasSize ? detailWidth : undefined,
    height: hasSize ? Math.round((detailWidth * fullHeight) / fullWidth) : undefined,
    alt:
      cleanText(record.thumbnail?.alt_text) ?? fallbackAlt(title, cleanText(record.artist_title)),
    placeholder: lqip?.startsWith("data:image/") ? lqip : undefined,
    rights: record.is_public_domain ? "Общественное достояние (CC0)" : undefined,
  };
}

export function normalizeAicSummary(record: AicArtworkRecord, config?: AicConfig): ArtworkSummary {
  const title = cleanText(record.title) ?? UNTITLED;
  const image = normalizeAicImage(record, config);
  return {
    id: String(record.id),
    source: "aic",
    sourceLabel: SOURCE_LABELS.aic,
    sourceUrl: aicWebsiteUrl(record.id, config),
    title,
    artistName: cleanText(record.artist_title) ?? firstLine(record.artist_display),
    dateDisplay: cleanText(record.date_display),
    isPublicDomain: record.is_public_domain ?? undefined,
    image: image && {
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
      iiifUrl: image.iiifUrl,
      alt: image.alt,
      width: image.width,
      height: image.height,
      placeholder: image.placeholder,
    },
  };
}

function firstLine(value: string | null | undefined): string | undefined {
  return cleanText(value?.split("\n")[0]);
}

function plain(value: string | null | undefined): string | undefined {
  const text = cleanText(value);
  return text ? cleanText(stripHtml(text)) : undefined;
}

export function normalizeAicArtwork(record: AicArtworkRecord, config?: AicConfig): Artwork {
  const summary = normalizeAicSummary(record, config);
  const style = cleanText(record.style_title);
  const subjects = uniqueStrings(record.subject_titles ?? []);
  const tags = uniqueStrings(record.term_titles ?? []).filter(isMeaningfulTag);
  const descriptionRaw = cleanText(record.description);
  const descriptionHtml =
    descriptionRaw && looksLikeHtml(descriptionRaw) ? sanitizeHtml(descriptionRaw) : undefined;
  const genre = matchGenre([...subjects, ...tags]);

  return {
    ...summary,
    apiUrl: cleanText(record.api_link),
    image: normalizeAicImage(record, config),
    artistDisplay: cleanText(record.artist_display),
    artistId: record.artist_id != null ? String(record.artist_id) : undefined,
    dateStart: record.date_start ?? undefined,
    dateEnd: record.date_end ?? undefined,
    rightsStatement: record.is_public_domain
      ? "Общественное достояние. Изображение доступно по лицензии CC0."
      : (cleanText(record.copyright_notice) ??
        "Музей не отмечает произведение как общественное достояние."),
    description: descriptionHtml
      ? { content: descriptionHtml, format: "html" }
      : descriptionRaw
        ? { content: descriptionRaw, format: "text" }
        : undefined,
    shortDescription: plain(record.short_description),
    publicationHistory: plain(record.publication_history),
    exhibitionHistory: plain(record.exhibition_history),
    provenance: plain(record.provenance_text),
    textLicense: descriptionRaw
      ? "Текст описания © Art Institute of Chicago, лицензия CC BY 4.0."
      : undefined,
    style,
    styleId: cleanText(record.style_id),
    alternateStyles: uniqueStrings(record.style_titles ?? []).filter(
      (value) => value.toLowerCase() !== style?.toLowerCase(),
    ),
    classification: cleanText(record.classification_title),
    artworkType: cleanText(record.artwork_type_title),
    genre: genre?.museumValue,
    subjects,
    tags,
    medium: cleanText(record.medium_display),
    dimensions: cleanText(record.dimensions),
    department: cleanText(record.department_title),
    gallery: cleanText(record.gallery_title),
    placeOfOrigin: cleanText(record.place_of_origin),
    creditLine: cleanText(record.credit_line),
    accessionNumber: cleanText(record.main_reference_number),
    inscriptions: uniqueStrings((record.inscriptions ?? "").split(/\n+/)),
    rawMetadata: record as Record<string, unknown>,
  };
}
