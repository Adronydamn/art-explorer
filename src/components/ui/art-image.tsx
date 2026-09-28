"use client";

import { ImageOff } from "lucide-react";
import Image, { type ImageLoader } from "next/image";
import { useState } from "react";
import { buildAicProxyUrl, imageIdFromIiifBase, snapAicWidth } from "@/lib/api/aic/image";
import type { ArtworkImage } from "@/lib/artwork/types";
import { cn } from "@/lib/utils/cn";

/**
 * AIC images bypass the Next.js optimizer: IIIF already serves sized JPEGs, so the loader picks the
 * nearest IIIF width (843px max for non-public-domain works) and requests it via the same-origin proxy.
 */
function createIiifLoader(imageId: string, maxWidth: number): ImageLoader {
  return ({ width }) => buildAicProxyUrl(imageId, snapAicWidth(width, maxWidth));
}

type ArtImageProps = {
  image: Pick<
    ArtworkImage,
    "url" | "alt" | "iiifUrl" | "placeholder" | "thumbnailUrl" | "width" | "height"
  >;
  sizes: string;
  /** Use the small thumbnail rendition for non-IIIF sources. */
  variant?: "thumbnail" | "detail";
  priority?: boolean;
  /** Allow IIIF renditions above 843px (public-domain AIC works only). */
  allowLarge?: boolean;
  className?: string;
  imageClassName?: string;
  fit?: "contain" | "cover";
};

/** Artwork image that fills its (aspect-ratio sized) parent, with an accessible fallback. */
export function ArtImage({
  image,
  sizes,
  variant = "thumbnail",
  priority = false,
  allowLarge = false,
  className,
  imageClassName,
  fit = "contain",
}: ArtImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper-sunk p-4 text-center text-ink-subtle",
          className,
        )}
      >
        <ImageOff aria-hidden className="size-6" />
        <span className="text-xs">Изображение не загрузилось</span>
        <span className="sr-only">{image.alt}</span>
      </div>
    );
  }

  const src =
    variant === "thumbnail" && !image.iiifUrl ? (image.thumbnailUrl ?? image.url) : image.url;
  const imageId = image.iiifUrl ? imageIdFromIiifBase(image.iiifUrl) : undefined;
  const loader = imageId ? createIiifLoader(imageId, allowLarge ? 1686 : 843) : undefined;

  return (
    <div className={cn("absolute inset-0", !loaded && !image.placeholder && "skeleton", className)}>
      <Image
        src={src}
        alt={image.alt}
        fill
        sizes={sizes}
        loader={loader}
        priority={priority}
        placeholder={image.placeholder ? "blur" : "empty"}
        blurDataURL={image.placeholder}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          fit === "contain" ? "object-contain" : "object-cover",
          "transition-opacity duration-(--duration-slow)",
          loaded || image.placeholder ? "opacity-100" : "opacity-0",
          imageClassName,
        )}
      />
    </div>
  );
}

export function aspectRatioOf(
  image: { width?: number; height?: number } | undefined,
  fallback = 4 / 5,
): number {
  if (!image?.width || !image.height) return fallback;
  const ratio = image.width / image.height;
  // Clamp extreme panoramas / scrolls so cards remain usable.
  return Math.min(Math.max(ratio, 0.45), 2.4);
}
