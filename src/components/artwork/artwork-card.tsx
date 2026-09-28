import { ImageOff } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArtImage } from "@/components/ui/art-image";
import type { ArtworkSummary } from "@/lib/artwork/types";
import { SOURCE_LABELS } from "@/lib/artwork/types";
import { Highlight } from "@/components/search/highlight";

type ArtworkCardProps = {
  artwork: ArtworkSummary;
  highlight?: string;
  eyebrow?: string;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
  footer?: ReactNode;
};

export function artworkHref(artwork: Pick<ArtworkSummary, "source" | "id">): string {
  return `/artwork/${artwork.source}/${encodeURIComponent(artwork.id)}`;
}

/** Editorial artwork card: matted image, serif title, compact museum line. */
export function ArtworkCard({
  artwork,
  highlight,
  eyebrow,
  headingLevel = "h3",
  priority,
  footer,
}: ArtworkCardProps) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="mat relative">
        <div className="relative aspect-[4/5] overflow-hidden">
          {artwork.image ? (
            <ArtImage
              image={artwork.image}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, (min-width: 480px) 45vw, 90vw"
              priority={priority}
              imageClassName="transition-transform duration-(--duration-slow) ease-(--ease-museum) motion-safe:group-hover:scale-[1.015]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-ink-subtle">
              <ImageOff aria-hidden className="size-6" />
              <span className="text-xs">Нет изображения</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-4">
        {eyebrow && <p className="label">{eyebrow}</p>}
        <Heading className="font-display text-2xl leading-tight font-semibold text-balance">
          <Link
            href={artworkHref(artwork)}
            className="outline-none after:absolute after:inset-0 after:content-[''] hover:text-accent focus-visible:underline"
          >
            {highlight ? <Highlight text={artwork.title} query={highlight} /> : artwork.title}
          </Link>
        </Heading>
        <p className="text-sm text-ink-muted">
          {[artwork.artistName ?? "Автор не указан", artwork.dateDisplay]
            .filter(Boolean)
            .join(", ")}
        </p>
        <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-xs text-ink-subtle">
          <span>{SOURCE_LABELS[artwork.source]}</span>
          {artwork.isPublicDomain && (
            <span className="rounded-xs bg-verdigris-soft px-1.5 py-0.5 text-2xs font-medium text-verdigris">
              Открытый доступ
            </span>
          )}
        </p>
        {footer && <div className="relative z-10 pt-2">{footer}</div>}
      </div>
    </article>
  );
}

export function ArtworkCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      <div className="mat">
        <div className="skeleton aspect-[4/5]" />
      </div>
      <div className="space-y-2 pt-4">
        <div className="skeleton h-6 w-4/5" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    </div>
  );
}
