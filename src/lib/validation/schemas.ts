import { z } from "zod";
import { ARTWORK_SOURCES } from "@/lib/artwork/types";

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 120;

const booleanParam = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((value) => value === "true" || value === "1");

export const searchQuerySchema = z
  .string({ error: "Введите поисковый запрос" })
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(MIN_QUERY_LENGTH, `Запрос должен содержать минимум ${MIN_QUERY_LENGTH} символа`)
      .max(MAX_QUERY_LENGTH, `Запрос не должен превышать ${MAX_QUERY_LENGTH} символов`),
  );

export const sourceFilterSchema = z.enum(["all", ...ARTWORK_SOURCES]).catch("all");

export const searchParamsSchema = z.object({
  q: searchQuerySchema,
  source: z
    .enum(["all", ...ARTWORK_SOURCES])
    .optional()
    .default("all"),
  hasImage: booleanParam,
  publicDomain: booleanParam,
  page: z.coerce.number().int().min(1).max(50).optional().default(1),
  limit: z.coerce.number().int().min(1).max(24).optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/** AIC ids are integers; CMA ids are integers (accession numbers are also accepted by the API). */
export const artworkParamsSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("aic"),
    id: z.string().regex(/^\d{1,10}$/, "Некорректный идентификатор"),
  }),
  z.object({
    source: z.literal("cma"),
    id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9.\-]{0,39}$/, "Некорректный идентификатор"),
  }),
]);

export type ArtworkParams = z.infer<typeof artworkParamsSchema>;

export const wikipediaSearchParamsSchema = z.object({
  q: searchQuerySchema,
  lang: z.enum(["ru", "en"]).optional().default("ru"),
});

/** Parses URLSearchParams into a plain object (first value wins). */
export function searchParamsToObject(params: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of params) {
    if (!(key in result)) result[key] = value;
  }
  return result;
}

/** Normalizes Next.js page searchParams (string | string[] | undefined) into strings. */
export function pageParamsToObject(
  params: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) result[key] = first;
  }
  return result;
}
