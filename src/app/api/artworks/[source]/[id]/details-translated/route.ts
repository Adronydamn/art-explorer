import { NextResponse, type NextRequest } from "next/server";
import { logServerError } from "@/lib/api/http";
import { cacheHeaders, checkRateLimit, jsonError, validationError } from "@/lib/api/responses";
import { getLocalizedArtworkDetails } from "@/lib/services/artworks";
import { artworkParamsSchema } from "@/lib/validation/schemas";

type Context = { params: Promise<{ source: string; id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const limited = checkRateLimit(request);
  if (limited) return limited;

  const parsed = artworkParamsSchema.safeParse(await params);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const artwork = await getLocalizedArtworkDetails(parsed.data.source, parsed.data.id);
    if (!artwork) return jsonError(404, "not_found", "Произведение не найдено");

    return NextResponse.json(
      {
        description: artwork.description,
        shortDescription: artwork.shortDescription,
        commentary: artwork.commentary,
        didYouKnow: artwork.didYouKnow,
        provenance: artwork.provenance,
        exhibitionHistory: artwork.exhibitionHistory,
        publicationHistory: artwork.publicationHistory,
      },
      { headers: cacheHeaders(3600, 86400) },
    );
  } catch (error) {
    logServerError("api/details-translated", error);
    return jsonError(503, "internal_error", "Перевод подробных сведений временно недоступен");
  }
}
