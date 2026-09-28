import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { ArtworkActions } from "@/components/artwork/artwork-actions";
import { ArtworkDescription } from "@/components/artwork/artwork-description";
import { ArtworkImage } from "@/components/artwork/artwork-image";
import { ArtworkMetadata } from "@/components/artwork/artwork-metadata";
import { ArtworkBreadcrumbs } from "@/components/artwork/back-to-results";
import { RelatedArtworks, RelatedArtworksSkeleton } from "@/components/artwork/related-artworks";
import { StyleContextSection, StyleContextSkeleton } from "@/components/artwork/style-context";
import { pageContainer } from "@/components/ui/styles";
import type { Artwork } from "@/lib/artwork/types";
import { getArtwork } from "@/lib/services/artworks";
import { artworkParamsSchema } from "@/lib/validation/schemas";
import { DISCLAIMER } from "@/lib/content";

type PageProps = { params: Promise<{ source: string; id: string }> };

const loadArtwork = cache(async (source: string, id: string): Promise<Artwork> => {
  let decodedId = id;
  try {
    decodedId = decodeURIComponent(id);
  } catch {
    notFound();
  }
  const parsed = artworkParamsSchema.safeParse({ source, id: decodedId });
  if (!parsed.success) notFound();
  const artwork = await getArtwork(parsed.data.source, parsed.data.id);
  if (!artwork) notFound();
  return artwork;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { source, id } = await params;
  try {
    const artwork = await loadArtwork(source, id);
    const byline = [artwork.artistName, artwork.dateDisplay].filter(Boolean).join(", ");
    const description = `${artwork.title}${byline ? ` — ${byline}` : ""}. ${artwork.sourceLabel}.`;
    const ogImage = artwork.image?.url;
    return {
      title: artwork.title,
      description,
      alternates: { canonical: `/artwork/${artwork.source}/${encodeURIComponent(artwork.id)}` },
      openGraph: {
        title: artwork.title,
        description,
        type: "article",
        images: ogImage ? [{ url: ogImage, alt: artwork.image?.alt }] : undefined,
      },
    };
  } catch {
    return { title: "Произведение" };
  }
}

export default async function ArtworkPage({ params }: PageProps) {
  const { source, id } = await params;
  const artwork = await loadArtwork(source, id);
  const byline = [artwork.artistName, artwork.dateDisplay].filter(Boolean);

  return (
    <article className={`${pageContainer} pt-4 pb-10 sm:pt-6`}>
      <ArtworkBreadcrumbs title={artwork.title} />

      <div className="mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-14 lg:gap-y-8">
        <header className="animate-rise lg:col-start-2 lg:row-start-1">
          <p className="label">
            {artwork.sourceLabel}
            <span aria-hidden> · </span>
            <span className="sr-only">, </span>
            {artwork.artworkType ?? "Произведение"}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-balance break-words sm:text-5xl">
            {artwork.title}
          </h1>
          {byline.length > 0 && (
            <p className="mt-4 text-lg text-ink-muted sm:text-xl">{byline.join(", ")}</p>
          )}
          <p className="mt-2 text-sm text-ink-subtle">
            Данные: {artwork.sourceLabel} (открытые данные музея)
          </p>
        </header>

        <div className="lg:sticky lg:top-24 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:self-start">
          <ArtworkImage
            image={artwork.image}
            title={artwork.title}
            isPublicDomain={artwork.isPublicDomain}
          />
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <ArtworkActions
            museumName={artwork.sourceLabel}
            favorite={{
              source: artwork.source,
              id: artwork.id,
              title: artwork.title,
              artistName: artwork.artistName,
              dateDisplay: artwork.dateDisplay,
              museum: artwork.sourceLabel,
              sourceUrl: artwork.sourceUrl,
              thumbnail: artwork.image
                ? {
                    url: artwork.image.thumbnailUrl ?? artwork.image.url,
                    iiifUrl: artwork.image.iiifUrl,
                    alt: artwork.image.alt,
                  }
                : undefined,
            }}
          />
        </div>

        <div className="lg:col-start-2 lg:row-start-3">
          <ArtworkMetadata artwork={artwork} />
        </div>
      </div>

      <div className="mt-16 grid gap-16 lg:mt-24 lg:gap-24">
        <ArtworkDescription artwork={artwork} />

        <Suspense fallback={<StyleContextSkeleton />}>
          <StyleContextSection artwork={artwork} />
        </Suspense>

        <Suspense fallback={<RelatedArtworksSkeleton />}>
          <RelatedArtworks artwork={artwork} />
        </Suspense>

        <p className="max-w-prose border-t border-line pt-6 text-xs text-ink-subtle">
          {DISCLAIMER}
        </p>
      </div>
    </article>
  );
}
