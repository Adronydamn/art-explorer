import type { NextRequest } from "next/server";
import { z } from "zod";
import { AIC_IMAGE_ID, AIC_PROXY_WIDTHS, buildIiifImageUrl } from "@/lib/api/aic/image";
import { logServerError } from "@/lib/api/http";
import { clientKey, RateLimiter } from "@/lib/api/rate-limit";
import { jsonError, validationError } from "@/lib/api/responses";
import { APP_USER_AGENT, getServerEnv } from "@/lib/env";

type Context = { params: Promise<{ imageId: string; width: string }> };

const paramsSchema = z.object({
  imageId: z.string().regex(AIC_IMAGE_ID, "Некорректный идентификатор изображения"),
  width: z.coerce
    .number()
    .int()
    .refine(
      (value) => (AIC_PROXY_WIDTHS as readonly number[]).includes(value),
      "Недопустимая ширина",
    ),
});

/** Image grids load many thumbnails at once, so this limiter is more generous than the JSON one. */
const limiter = new RateLimiter({ capacity: 300, refillPerSecond: 20 });
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Same-origin proxy for AIC IIIF images. Only the image id and a whitelisted width come from the
 * client; the upstream host is fixed by server configuration, so the route cannot be used for SSRF.
 */
export async function GET(request: NextRequest, { params }: Context) {
  if (!limiter.consume(clientKey(request.headers)).allowed) {
    return jsonError(429, "rate_limited", "Слишком много запросов");
  }
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return validationError(parsed.error);

  const { AIC_IIIF_URL, EXTERNAL_API_TIMEOUT_MS } = getServerEnv();
  const upstream = buildIiifImageUrl(
    `${AIC_IIIF_URL.replace(/\/+$/, "")}/${parsed.data.imageId}`,
    parsed.data.width,
  );

  try {
    const response = await fetch(upstream, {
      headers: { "AIC-User-Agent": APP_USER_AGENT, Accept: "image/jpeg,image/*" },
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      cache: "no-store",
    });
    const type = response.headers.get("content-type") ?? "";
    const length = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok || !type.startsWith("image/") || length > MAX_BYTES || !response.body) {
      if (response.status !== 404)
        logServerError("aic-image", new Error(`Upstream ${response.status} ${type}`));
      return jsonError(
        response.status === 404 ? 404 : 502,
        response.status === 404 ? "not_found" : "upstream_unavailable",
        "Изображение недоступно",
      );
    }
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=604800, s-maxage=2592000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logServerError("aic-image", error);
    return jsonError(504, "upstream_unavailable", "Изображение временно недоступно");
  }
}
