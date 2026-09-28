import { NextResponse, type NextRequest } from "next/server";
import { AllSourcesFailedError } from "@/lib/api/providers/aggregate-search";
import { logServerError } from "@/lib/api/http";
import { cacheHeaders, checkRateLimit, jsonError, validationError } from "@/lib/api/responses";
import { searchArtworks } from "@/lib/services/artworks";
import { searchParamsSchema, searchParamsToObject } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request);
  if (limited) return limited;

  const parsed = searchParamsSchema.safeParse(searchParamsToObject(request.nextUrl.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  const { q, source, hasImage, publicDomain, page, limit } = parsed.data;
  try {
    const result = await searchArtworks({
      query: q,
      source,
      hasImage,
      publicDomain,
      page,
      perSource: limit ?? 12,
    });
    const partial = result.sources.some((status) => !status.ok);
    return NextResponse.json(result, { headers: cacheHeaders(partial ? 15 : 300, 600) });
  } catch (error) {
    if (error instanceof AllSourcesFailedError) {
      return jsonError(
        503,
        "upstream_unavailable",
        "Музейные источники временно недоступны. Попробуйте позже.",
      );
    }
    logServerError("api/search", error);
    return jsonError(500, "internal_error", "Не удалось выполнить поиск");
  }
}
