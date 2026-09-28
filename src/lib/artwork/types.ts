export const ARTWORK_SOURCES = ["aic", "cma"] as const;

export type ArtworkSource = (typeof ARTWORK_SOURCES)[number];

export type MuseumName = "Art Institute of Chicago" | "Cleveland Museum of Art";

export const SOURCE_LABELS: Record<ArtworkSource, MuseumName> = {
  aic: "Art Institute of Chicago",
  cma: "Cleveland Museum of Art",
};

export const SOURCE_SHORT_LABELS: Record<ArtworkSource, string> = {
  aic: "AIC",
  cma: "CMA",
};

export type ArtworkImage = {
  /** Detail-size image URL. */
  url: string;
  width?: number;
  height?: number;
  alt: string;
  /** Small image for cards and suggestions. */
  thumbnailUrl?: string;
  /** Large image for the zoomable viewer. */
  largeUrl?: string;
  /** IIIF image base (…/iiif/2/{image_id}); when present the client builds sized URLs itself. */
  iiifUrl?: string;
  /** Low-quality image placeholder (data URI) supplied by the museum. */
  placeholder?: string;
  rights?: string;
};

export type ArtworkText = {
  /** Plain text or sanitized HTML. */
  content: string;
  format: "text" | "html";
};

export type Artwork = {
  id: string;
  source: ArtworkSource;
  sourceLabel: MuseumName;
  /** Public museum page for the object. */
  sourceUrl: string;
  /** Machine API URL of the record (for attribution / debugging). */
  apiUrl?: string;

  title: string;
  artistName?: string;
  artistDisplay?: string;
  artistId?: string;

  dateDisplay?: string;
  dateStart?: number;
  dateEnd?: number;

  image?: ArtworkImage;

  isPublicDomain?: boolean;
  rightsStatement?: string;

  description?: ArtworkText;
  shortDescription?: string;
  commentary?: string;
  didYouKnow?: string;
  publicationHistory?: string;
  provenance?: string;
  exhibitionHistory?: string;
  /** License / attribution note for museum-authored text. */
  textLicense?: string;

  style?: string;
  styleId?: string;
  alternateStyles: string[];
  period?: string;
  classification?: string;
  artworkType?: string;
  genre?: string;

  subjects: string[];
  tags: string[];

  medium?: string;
  dimensions?: string;
  department?: string;
  collection?: string;
  gallery?: string;
  culture?: string;
  placeOfOrigin?: string;
  creditLine?: string;
  accessionNumber?: string;
  inscriptions: string[];

  /** Raw record for server-side debugging. Never used by UI components. */
  rawMetadata?: Record<string, unknown>;
};

/** Compact representation used by search results, suggestions and related works. */
export type ArtworkSummary = Pick<
  Artwork,
  | "id"
  | "source"
  | "sourceLabel"
  | "sourceUrl"
  | "title"
  | "artistName"
  | "dateDisplay"
  | "isPublicDomain"
> & {
  image?: Pick<
    ArtworkImage,
    "url" | "thumbnailUrl" | "iiifUrl" | "alt" | "width" | "height" | "placeholder"
  >;
};

export type SearchOptions = {
  limit?: number;
  page?: number;
  hasImage?: boolean;
  publicDomain?: boolean;
  signal?: AbortSignal;
};

export type ProviderSearchResult = {
  source: ArtworkSource;
  items: ArtworkSummary[];
  total: number;
};

export type SourceStatus = {
  source: ArtworkSource;
  ok: boolean;
  total: number;
};

export type AggregatedSearchResult = {
  query: string;
  items: ArtworkSummary[];
  total: number;
  page: number;
  hasMore: boolean;
  sources: SourceStatus[];
};

export type StyleContextSource = "Wikipedia" | MuseumName;

export type StyleContextKind = "style" | "period" | "artist" | "technique" | "genre" | "culture";

export type StyleMatchConfidence = "high" | "medium" | "low";

export type MuseumEvidence = {
  field: string;
  value: string;
  source: MuseumName;
};

export type ReferenceStatus = "found" | "not-found" | "unavailable";

export type StyleContext = {
  primaryLabel?: string;
  kind: StyleContextKind;

  summary?: string;
  characteristics: string[];
  relatedTerms: string[];

  sourceName: StyleContextSource;
  sourceUrl?: string;
  sourceLanguage?: "ru" | "en";
  wikipediaTitle?: string;

  confidence: StyleMatchConfidence;
  attribution: string;

  /** Museum fields that justify showing this context. Always non-empty. */
  museumEvidence: MuseumEvidence[];
  /** Whether a Wikipedia reference was found for the museum term. */
  referenceStatus: ReferenceStatus;
};

export type StyleContextResult = {
  context: StyleContext | null;
  /** True when Wikipedia could not be reached (timeouts, 5xx, 429). */
  wikipediaUnavailable: boolean;
};

export type RelatedReason = "artist" | "style" | "period" | "genre" | "tags" | "technique";

export type RelatedArtwork = ArtworkSummary & { reason: RelatedReason };

export function isArtworkSource(value: string): value is ArtworkSource {
  return (ARTWORK_SOURCES as readonly string[]).includes(value);
}

export function toSummary(artwork: Artwork): ArtworkSummary {
  const { image } = artwork;
  return {
    id: artwork.id,
    source: artwork.source,
    sourceLabel: artwork.sourceLabel,
    sourceUrl: artwork.sourceUrl,
    title: artwork.title,
    artistName: artwork.artistName,
    dateDisplay: artwork.dateDisplay,
    isPublicDomain: artwork.isPublicDomain,
    image: image
      ? {
          url: image.url,
          thumbnailUrl: image.thumbnailUrl,
          iiifUrl: image.iiifUrl,
          alt: image.alt,
          width: image.width,
          height: image.height,
          placeholder: image.placeholder,
        }
      : undefined,
  };
}
