import { NextResponse, type NextRequest } from "next/server";
import { logServerError } from "@/lib/api/http";
import { cacheHeaders, checkRateLimit, jsonError, validationError } from "@/lib/api/responses";
import { getRawArtwork, getStyleContext } from "@/lib/services/artworks";
import { artworkParamsSchema } from "@/lib/validation/schemas";

type Context = { params: Promise<{ source: string; id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const limited = checkRateLimit(request);
  if (limited) return limited;

  const parsed = artworkParamsSchema.safeParse(await params);
  if (!parsed.success) return validationError(parsed.error);

  let artwork;
  try {
    artwork = await getRawArtwork(parsed.data.source, parsed.data.id);
  } catch (error) {
    logServerError("api/style", error);
    return jsonError(503, "upstream_unavailable", "Музейный источник временно недоступен");
  }
  if (!artwork) return jsonError(404, "not_found", "Произведение не найдено");

  const result = await getStyleContext(artwork);
  return NextResponse.json(result, {
    headers: cacheHeaders(result.wikipediaUnavailable ? 60 : 3600, 86400),
  });
}
