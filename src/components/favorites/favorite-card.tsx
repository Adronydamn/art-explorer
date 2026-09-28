"use client";

import { ImageOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { ArtImage } from "@/components/ui/art-image";
import type { FavoriteArtwork } from "@/lib/favorites/store";

type FavoriteCardProps = {
  item: FavoriteArtwork;
  onRemove: () => void;
};

export function FavoriteCard({ item, onRemove }: FavoriteCardProps) {
  const href = `/artwork/${item.source}/${encodeURIComponent(item.id)}`;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="mat">
        <div className="relative aspect-[4/5] overflow-hidden">
          {item.thumbnail ? (
            <ArtImage
              image={item.thumbnail}
              sizes="(min-width: 1024px) 30vw, (min-width: 480px) 45vw, 90vw"
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
        <h2 className="font-display text-2xl leading-tight font-semibold text-balance">
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:content-[''] hover:text-accent focus-visible:underline"
          >
            {item.title}
          </Link>
        </h2>
        <p className="text-sm text-ink-muted">
          {[item.artistName ?? "Автор не указан", item.dateDisplay].filter(Boolean).join(", ")}
        </p>
        {item.museum && <p className="text-xs text-ink-subtle">{item.museum}</p>}
        <div className="relative z-10 mt-auto pt-3">
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm text-ink-muted hover:text-accent"
          >
            <Trash2 aria-hidden className="size-4" />
            Удалить<span className="sr-only"> «{item.title}» из избранного</span>
          </button>
        </div>
      </div>
    </article>
  );
}
