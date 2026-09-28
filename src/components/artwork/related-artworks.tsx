import { ArtworkCard, ArtworkCardSkeleton } from "@/components/artwork/artwork-card";
import { RELATED_REASON_LABELS } from "@/lib/artwork/related";
import type { Artwork } from "@/lib/artwork/types";
import { getRelatedArtworks } from "@/lib/services/artworks";

/** Renders nothing when no museum-based relation could be established. */
export async function RelatedArtworks({ artwork }: { artwork: Artwork }) {
  const related = await getRelatedArtworks(artwork);
  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-ink pt-6">
        <h2 id="related-heading" className="font-display text-3xl font-semibold">
          Похожие работы
        </h2>
        <p className="text-xs text-ink-subtle">
          Подобрано по данным {artwork.sourceLabel}: тот же автор или музейный стиль
        </p>
      </div>
      <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 xs:grid-cols-2 lg:grid-cols-3">
        {related.map((item) => (
          <li key={`${item.source}:${item.id}`}>
            <ArtworkCard artwork={item} eyebrow={RELATED_REASON_LABELS[item.reason]} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RelatedArtworksSkeleton() {
  return (
    <div role="status" aria-label="Загружаем похожие работы">
      <div className="skeleton h-8 w-56" />
      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 xs:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <ArtworkCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
