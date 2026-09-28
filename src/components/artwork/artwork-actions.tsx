"use client";

import { Bookmark, BookmarkCheck, ExternalLink, Share2 } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useToast } from "@/components/ui/toast";
import { buttonVariants } from "@/components/ui/styles";
import { favoriteKey, hasFavorite, type FavoriteArtwork } from "@/lib/favorites/store";

type ArtworkActionsProps = {
  favorite: Omit<FavoriteArtwork, "savedAt">;
  museumName: string;
};

export function ArtworkActions({ favorite, museumName }: ArtworkActionsProps) {
  const { favorites, add, remove } = useFavorites();
  const { notify } = useToast();
  const key = favoriteKey(favorite);
  const saved = favorites ? hasFavorite(favorites, key) : false;

  function toggleFavorite() {
    const ok = saved ? remove(key) : add({ ...favorite, savedAt: new Date().toISOString() });
    if (!ok) notify("Не удалось сохранить: хранилище браузера недоступно.");
    else notify(saved ? "Работа удалена из избранного" : "Работа добавлена в избранное");
  }

  async function share() {
    const url = window.location.href;
    const data = { title: favorite.title, text: `${favorite.title} — Art Explorer`, url };
    if (
      typeof navigator.share === "function" &&
      (!navigator.canShare || navigator.canShare(data))
    ) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      notify("Ссылка скопирована в буфер обмена");
    } catch {
      notify("Не удалось скопировать ссылку. Скопируйте адрес из строки браузера.");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={toggleFavorite}
        aria-pressed={saved}
        disabled={favorites === null}
        className={saved ? buttonVariants.accent : buttonVariants.primary}
      >
        {saved ? (
          <BookmarkCheck aria-hidden className="size-4" />
        ) : (
          <Bookmark aria-hidden className="size-4" />
        )}
        {saved ? "В избранном" : "В избранное"}
      </button>
      <button type="button" onClick={share} className={buttonVariants.outline}>
        <Share2 aria-hidden className="size-4" />
        Поделиться
      </button>
      <a
        href={favorite.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants.outline}
      >
        <ExternalLink aria-hidden className="size-4" />
        Открыть первоисточник
        <span className="sr-only">на сайте {museumName} (откроется в новой вкладке)</span>
      </a>
    </div>
  );
}
