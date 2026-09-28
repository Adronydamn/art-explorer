import { z } from "zod";

export const WIKI_LANGUAGES = ["ru", "en"] as const;
export type WikiLanguage = (typeof WIKI_LANGUAGES)[number];

export const wikiSearchPageSchema = z.object({
  id: z.number(),
  key: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  matched_title: z.string().nullish(),
});

export const wikiSearchResponseSchema = z.object({
  pages: z.array(wikiSearchPageSchema),
});

export type WikiSearchPage = z.infer<typeof wikiSearchPageSchema>;

export const wikiSummarySchema = z.object({
  type: z.string(),
  title: z.string(),
  lang: z.string().nullish(),
  description: z.string().nullish(),
  extract: z.string().nullish(),
  extract_html: z.string().nullish(),
  content_urls: z
    .object({
      desktop: z.object({ page: z.string() }).nullish(),
    })
    .nullish(),
});

export type WikiSummaryRaw = z.infer<typeof wikiSummarySchema>;

export const wikiLanguageLinksSchema = z.array(
  z.object({
    code: z.string(),
    key: z.string(),
    title: z.string(),
  }),
);

export type WikiLanguageLink = z.infer<typeof wikiLanguageLinksSchema>[number];
