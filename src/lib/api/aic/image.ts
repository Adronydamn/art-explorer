export const AIC_DEFAULT_IIIF_URL = "https://www.artic.edu/iiif/2";

/** Widths recommended by AIC; 843px is pre-cached by their IIIF server. */
export const AIC_IMAGE_WIDTHS = {
  thumbnail: 400,
  detail: 843,
  large: 1686,
} as const;

/** The only widths the image proxy accepts (keeps upstream cache hits high). */
export const AIC_PROXY_WIDTHS = [200, 400, 843, 1686] as const;
export type AicProxyWidth = (typeof AIC_PROXY_WIDTHS)[number];

export const AIC_IMAGE_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const LOOSE_IMAGE_ID = /^[a-f0-9-]{8,64}$/i;

/** Returns the IIIF base URL (…/iiif/2/{image_id}) or undefined when there is no usable image id. */
export function buildAicIiifBase(
  imageId: string | null | undefined,
  iiifUrl?: string | null,
): string | undefined {
  const id = imageId?.trim();
  if (!id || !LOOSE_IMAGE_ID.test(id)) return undefined;
  const base = (iiifUrl?.trim() || AIC_DEFAULT_IIIF_URL).replace(/\/+$/, "");
  return `${base}/${id}`;
}

/** Builds a IIIF Image API URL with a fixed width and proportional height. */
export function buildIiifImageUrl(iiifBase: string, width: number): string {
  return `${iiifBase}/full/${Math.round(width)},/0/default.jpg`;
}

/**
 * Same-origin proxy URL for an AIC image. The AIC IIIF server sits behind a bot challenge that
 * blocks plain browser/server requests; the proxy adds the documented `AIC-User-Agent` header.
 */
export function buildAicProxyUrl(imageId: string, width: number): string {
  return `/api/images/aic/${imageId}/${snapAicWidth(width)}`;
}

export function snapAicWidth(width: number, maxWidth = 1686): AicProxyWidth {
  const allowed = AIC_PROXY_WIDTHS.filter((candidate) => candidate <= maxWidth);
  return allowed.find((candidate) => candidate >= width) ?? allowed.at(-1) ?? AIC_PROXY_WIDTHS[0];
}

/** Extracts the image id from a IIIF base URL (…/iiif/2/{image_id}). */
export function imageIdFromIiifBase(iiifBase: string): string | undefined {
  const id = iiifBase.split("/").at(-1);
  return id && LOOSE_IMAGE_ID.test(id) ? id : undefined;
}
