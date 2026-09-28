import type { CmaImages } from "./schemas";

export type CmaImageSelection = {
  /** Detail image (print rendition when available, otherwise web). */
  url: string;
  /** Small web rendition for cards. */
  thumbnailUrl: string;
  /** Largest browser-friendly rendition (JPEG) for the zoom viewer. */
  largeUrl: string;
  width?: number;
  height?: number;
};

function toNumber(value: number | string | null | undefined): number | undefined {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
}

function isBrowserImage(url: string | undefined): url is string {
  return (
    typeof url === "string" &&
    /^https?:\/\//.test(url) &&
    /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url)
  );
}

/**
 * Picks CMA image renditions. The `full` rendition is a huge TIFF and is never used.
 * Returns undefined when no browser-displayable rendition exists.
 */
export function selectCmaImage(images: CmaImages): CmaImageSelection | undefined {
  if (!images) return undefined;
  const web = isBrowserImage(images.web?.url) ? images.web : undefined;
  const print = isBrowserImage(images.print?.url) ? images.print : undefined;
  const detail = print ?? web;
  if (!detail) return undefined;

  return {
    url: detail.url,
    thumbnailUrl: (web ?? detail).url,
    largeUrl: detail.url,
    width: toNumber(detail.width),
    height: toNumber(detail.height),
  };
}
