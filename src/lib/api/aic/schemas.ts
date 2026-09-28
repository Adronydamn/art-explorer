import { z } from "zod";

const nullableString = z.string().nullish();
/** Secondary list fields: malformed values are dropped instead of rejecting the whole record. */
const stringList = z.array(z.string().nullable()).nullish().catch(undefined);

export const aicThumbnailSchema = z
  .object({
    lqip: nullableString,
    width: z.number().nullish(),
    height: z.number().nullish(),
    alt_text: nullableString,
  })
  .nullish()
  .catch(undefined);

export const aicConfigSchema = z
  .object({
    iiif_url: z.string().nullish(),
    website_url: z.string().nullish(),
  })
  .nullish();

export const aicArtworkSchema = z.object({
  id: z.number().int(),
  api_link: nullableString,
  title: nullableString,
  alt_titles: stringList,
  thumbnail: aicThumbnailSchema,
  main_reference_number: nullableString,
  date_start: z.number().int().nullish(),
  date_end: z.number().int().nullish(),
  date_display: nullableString,
  artist_display: nullableString,
  artist_title: nullableString,
  artist_id: z.number().int().nullish(),
  place_of_origin: nullableString,
  description: nullableString,
  short_description: nullableString,
  dimensions: nullableString,
  medium_display: nullableString,
  inscriptions: nullableString,
  credit_line: nullableString,
  publication_history: nullableString,
  exhibition_history: nullableString,
  provenance_text: nullableString,
  copyright_notice: nullableString,
  is_public_domain: z.boolean().nullish(),
  gallery_title: nullableString,
  artwork_type_title: nullableString,
  department_title: nullableString,
  style_id: nullableString,
  style_title: nullableString,
  style_titles: stringList,
  classification_title: nullableString,
  classification_titles: stringList,
  subject_titles: stringList,
  term_titles: stringList,
  technique_titles: stringList,
  image_id: nullableString,
});

export type AicArtworkRecord = z.infer<typeof aicArtworkSchema>;
export type AicConfig = z.infer<typeof aicConfigSchema>;

export const aicSearchResponseSchema = z.object({
  pagination: z
    .object({
      total: z.number().int().nonnegative(),
      limit: z.number().int().optional(),
      offset: z.number().int().optional(),
      current_page: z.number().int().optional(),
    })
    .nullish(),
  data: z.array(aicArtworkSchema),
  config: aicConfigSchema,
});

export const aicDetailResponseSchema = z.object({
  data: aicArtworkSchema,
  config: aicConfigSchema,
});

export type AicSearchResponse = z.infer<typeof aicSearchResponseSchema>;
export type AicDetailResponse = z.infer<typeof aicDetailResponseSchema>;

/** Fields requested for search results / suggestions (keeps payloads small). */
export const AIC_SEARCH_FIELDS = [
  "id",
  "title",
  "artist_title",
  "artist_display",
  "date_display",
  "image_id",
  "thumbnail",
  "is_public_domain",
] as const;

/** Fields requested for the detail record. */
export const AIC_DETAIL_FIELDS = [
  ...AIC_SEARCH_FIELDS,
  "api_link",
  "alt_titles",
  "main_reference_number",
  "date_start",
  "date_end",
  "artist_id",
  "place_of_origin",
  "description",
  "short_description",
  "dimensions",
  "medium_display",
  "inscriptions",
  "credit_line",
  "publication_history",
  "exhibition_history",
  "provenance_text",
  "copyright_notice",
  "gallery_title",
  "artwork_type_title",
  "department_title",
  "style_id",
  "style_title",
  "style_titles",
  "classification_title",
  "classification_titles",
  "subject_titles",
  "term_titles",
  "technique_titles",
] as const;
