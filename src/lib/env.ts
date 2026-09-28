import { z } from "zod";

/** Identifies the application to museum APIs (AIC asks for an `AIC-User-Agent` header). */
export const APP_USER_AGENT = "ArtExplorer/1.0 (educational art discovery application)";
const DEFAULT_WIKIPEDIA_USER_AGENT = APP_USER_AGENT;

function booleanFromEnv(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return value.trim() === "true" || value.trim() === "1" || value.trim() === "yes";
}

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  WIKIPEDIA_USER_AGENT: z.string().trim().min(1).default(DEFAULT_WIKIPEDIA_USER_AGENT),
  AIC_API_URL: z.url().default("https://api.artic.edu/api/v1"),
  AIC_IIIF_URL: z.url().default("https://www.artic.edu/iiif/2"),
  CMA_API_URL: z.url().default("https://openaccess-api.clevelandart.org/api"),
  WIKIPEDIA_URL_TEMPLATE: z
    .string()
    .refine((value) => value.includes("{lang}"), "Template must contain {lang}")
    .default("https://{lang}.wikipedia.org"),
  EXTERNAL_API_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(8_000),

  YANDEX_TRANSLATE_API_KEY: z.string().trim().min(1).optional(),
  YANDEX_TRANSLATE_FOLDER_ID: z.string().trim().min(1).optional(),
  YANDEX_TRANSLATE_URL: z.url().default("https://translate.api.cloud.yandex.net/translate/v2/translate"),
  TRANSLATION_ENABLED: z.preprocess(
    (value) => booleanFromEnv(value as string | undefined) ?? true,
    z.boolean().default(true),
  ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

function emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? undefined : value;
}

/** Validated server-side configuration. Never exposes secrets to the client. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: emptyToUndefined(process.env.NEXT_PUBLIC_APP_URL),
    WIKIPEDIA_USER_AGENT: emptyToUndefined(process.env.WIKIPEDIA_USER_AGENT),
    AIC_API_URL: emptyToUndefined(process.env.AIC_API_URL),
    AIC_IIIF_URL: emptyToUndefined(process.env.AIC_IIIF_URL),
    CMA_API_URL: emptyToUndefined(process.env.CMA_API_URL),
    WIKIPEDIA_URL_TEMPLATE: emptyToUndefined(process.env.WIKIPEDIA_URL_TEMPLATE),
    EXTERNAL_API_TIMEOUT_MS: emptyToUndefined(process.env.EXTERNAL_API_TIMEOUT_MS),

    YANDEX_TRANSLATE_API_KEY: emptyToUndefined(process.env.YANDEX_TRANSLATE_API_KEY),
    YANDEX_TRANSLATE_FOLDER_ID: emptyToUndefined(process.env.YANDEX_TRANSLATE_FOLDER_ID),
    YANDEX_TRANSLATE_URL: emptyToUndefined(process.env.YANDEX_TRANSLATE_URL),
    TRANSLATION_ENABLED: emptyToUndefined(process.env.TRANSLATION_ENABLED),
  });
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: forget cached env so tests can change process.env. */
export function resetServerEnvCache(): void {
  cached = undefined;
}
