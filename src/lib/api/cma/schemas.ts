import { z } from "zod";

const nullableString = z.string().nullish();
/** CMA returns numbers as strings in image metadata. */
const numeric = z.union([z.number(), z.string()]).nullish();

export const cmaImageVariantSchema = z
  .object({
    url: z.string(),
    width: numeric,
    height: numeric,
  })
  .nullish();

export const cmaImagesSchema = z
  .object({
    web: cmaImageVariantSchema,
    print: cmaImageVariantSchema,
    full: cmaImageVariantSchema,
  })
  .nullish();

export const cmaCreatorSchema = z.object({
  id: z.number().nullish(),
  description: nullableString,
  role: nullableString,
  qualifier: nullableString,
  extent: nullableString,
  biography: nullableString,
});

const provenanceSchema = z.object({ description: nullableString, date: nullableString });
const citationSchema = z.object({ citation: nullableString, page_number: nullableString });
const inscriptionSchema = z.object({
  inscription: nullableString,
  inscription_translation: nullableString,
});
const exhibitionSchema = z.object({ description: nullableString, title: nullableString });

/**
 * Secondary fields: a malformed value drops only that field instead of rejecting the record.
 * Core identity fields (id, title) stay strict.
 */
function lenient<T extends z.ZodType>(schema: T) {
  return schema.nullish().catch(undefined);
}

/** `culture`, `technique` etc. are strings in most records but arrays in some. */
const stringOrList = z.union([z.string(), z.array(z.string().nullable())]).nullish();

export const cmaArtworkSchema = z.object({
  id: z.number().int(),
  accession_number: nullableString,
  share_license_status: nullableString,
  copyright: nullableString,
  title: nullableString,
  creation_date: nullableString,
  creation_date_earliest: z.number().int().nullish(),
  creation_date_latest: z.number().int().nullish(),
  culture: lenient(stringOrList),
  technique: nullableString,
  department: nullableString,
  collection: nullableString,
  type: nullableString,
  period: nullableString,
  measurements: nullableString,
  current_location: nullableString,
  description: nullableString,
  wall_description: nullableString,
  did_you_know: nullableString,
  creditline: nullableString,
  url: nullableString,
  tags: lenient(z.array(z.string())),
  creators: lenient(z.array(cmaCreatorSchema)),
  images: lenient(cmaImagesSchema),
  provenance: lenient(z.array(provenanceSchema)),
  citations: lenient(z.array(citationSchema)),
  inscriptions: lenient(z.array(inscriptionSchema)),
  exhibitions: lenient(z.object({ current: z.array(exhibitionSchema).nullish() })),
});

export type CmaArtworkRecord = z.infer<typeof cmaArtworkSchema>;
export type CmaImages = z.infer<typeof cmaImagesSchema>;
export type CmaCreator = z.infer<typeof cmaCreatorSchema>;

export const cmaSearchResponseSchema = z.object({
  info: z.object({ total: z.number().int().nonnegative() }).nullish(),
  data: z.array(cmaArtworkSchema),
});

export const cmaDetailResponseSchema = z.object({
  data: cmaArtworkSchema,
});

export const CMA_SEARCH_FIELDS = [
  "id",
  "accession_number",
  "title",
  "creation_date",
  "creators",
  "images",
  "share_license_status",
  "url",
] as const;
