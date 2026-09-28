import { NextResponse, type NextRequest } from "next/server";
import { logServerError } from "@/lib/api/http";
import { cacheHeaders, checkRateLimit, jsonError, validationError } from "@/lib/api/responses";
import { searchTitles } from "@/lib/api/wikipedia/search";
import { getStyleProvider } from "@/lib/services/artworks";
import { searchParamsToObject, wikipediaSearchParamsSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request);
  if (limited) return limited;

  const parsed = wikipediaSearchParamsSchema.safeParse(
    searchParamsToObject(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { q, lang } = parsed.data;
  const client = getStyleProvider().wikipediaClient;
  try {
    const pages = await searchTitles(client, lang, q, 8);
    return NextResponse.json(
      {
        lang,
        results: pages.map((page) => ({
          title: page.title,
          description: page.description ?? undefined,
          url: client.articleUrl(lang, page.title),
        })),
      },
      { headers: cacheHeaders(3600, 6 * 3600) },
    );
  } catch (error) {
    logServerError("api/wikipedia", error);
    return jsonError(503, "upstream_unavailable", "Wikipedia временно недоступна");
  }
}
