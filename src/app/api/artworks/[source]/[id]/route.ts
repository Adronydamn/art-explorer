import { NextResponse, type NextRequest } from "next/server";
import { logServerError } from "@/lib/api/http";
import { cacheHeaders, checkRateLimit, jsonError, validationError } from "@/lib/api/responses";
import { getArtwork } from "@/lib/services/artworks";
import { artworkParamsSchema } from "@/lib/validation/schemas";

type Context = { params: Promise<{ source: string; id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const limited = checkRateLimit(request);
  if (limited) return limited;

  const parsed = artworkParamsSchema.safeParse(await params);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const artwork = await getArtwork(parsed.data.source, parsed.data.id);
    if (!artwork) return jsonError(404, "not_found", "Произведение не найдено");
    const { rawMetadata: _raw, ...publicArtwork } = artwork;
    return NextResponse.json({ artwork: publicArtwork }, { headers: cacheHeaders(3600, 86400) });
  } catch (error) {
    logServerError("api/artwork", error);
    return jsonError(503, "upstream_unavailable", "Музейный источник временно недоступен");
  }
}
