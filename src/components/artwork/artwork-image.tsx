"use client";

import { ImageOff, Maximize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ArtImage, aspectRatioOf } from "@/components/ui/art-image";
import type { ArtworkImage as ArtworkImageData } from "@/lib/artwork/types";

const ImageViewer = dynamic(() => import("./image-viewer"), { ssr: false });

type ArtworkImageProps = {
  image?: ArtworkImageData;
  title: string;
  isPublicDomain?: boolean;
};

export function ArtworkImage({ image, title, isPublicDomain }: ArtworkImageProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  if (!image) {
    return (
      <figure className="mat">
        <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 p-6 text-center text-ink-subtle">
          <ImageOff aria-hidden className="size-8" />
          <p className="max-w-xs text-sm">
            Музей не публикует изображение этой работы в открытых данных. Все подтверждённые
            сведения приведены ниже.
          </p>
        </div>
      </figure>
    );
  }

  const ratio = aspectRatioOf(image);

  return (
    <figure>
      <div className="mat">
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="group relative block w-full cursor-zoom-in overflow-hidden"
          style={{ aspectRatio: String(ratio) }}
          aria-label={`Открыть изображение «${title}» в полноэкранном просмотре`}
          aria-haspopup="dialog"
        >
          <ArtImage
            image={image}
            variant="detail"
            allowLarge={isPublicDomain}
            sizes="(min-width: 1024px) 55vw, 100vw"
            priority
          />
          <span
            aria-hidden
            className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-xs bg-ink/80 px-2.5 py-1.5 text-xs text-paper opacity-90 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"
          >
            <Maximize2 className="size-3.5" /> Приблизить
          </span>
        </button>
      </div>
      {image.rights && (
        <figcaption className="mt-3 text-xs text-ink-subtle">
          Изображение: {image.rights}
        </figcaption>
      )}
      {viewerOpen && (
        <ImageViewer
          src={image.largeUrl ?? image.url}
          alt={image.alt}
          title={title}
          width={image.width}
          height={image.height}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </figure>
  );
}
