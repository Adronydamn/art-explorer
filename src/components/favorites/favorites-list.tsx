"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ArtworkCardSkeleton } from "@/components/artwork/artwork-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { buttonVariants } from "@/components/ui/styles";
import { useToast } from "@/components/ui/toast";
import { useFavorites } from "@/hooks/use-favorites";
import { favoriteKey } from "@/lib/favorites/store";
import { FavoriteCard } from "./favorite-card";

export const EMPTY_FAVORITES_TEXT = "Здесь появятся картины, которые вы захотите изучить позже.";

export function FavoritesList() {
  const { favorites, remove, clear } = useFavorites();
  const { notify } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (favorites === null) {
    return (
      <div
        className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 xs:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-label="Загружаем избранное"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <ArtworkCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="mt-12 flex max-w-prose flex-col items-start gap-4">
        <Bookmark aria-hidden className="size-8 text-ochre" />
        <p className="font-display text-2xl">{EMPTY_FAVORITES_TEXT}</p>
        <p className="text-ink-muted">
          Нажмите «В избранное» на странице картины — она сохранится в этом браузере без
          регистрации.
        </p>
        <Link href="/" className={buttonVariants.primary}>
          Найти картину
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-line py-3">
        <p className="text-sm text-ink-muted" role="status">
          Сохранено работ: {favorites.length}
        </p>
        <button type="button" onClick={() => setConfirmOpen(true)} className={buttonVariants.ghost}>
          Очистить избранное
        </button>
      </div>
      <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 xs:grid-cols-2 lg:grid-cols-3">
        {favorites.map((item) => (
          <li key={favoriteKey(item)}>
            <FavoriteCard
              item={item}
              onRemove={() => {
                remove(favoriteKey(item));
                notify(`«${item.title}» удалена из избранного`);
              }}
            />
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirmOpen}
        title="Очистить избранное?"
        description="Все сохранённые работы будут удалены из этого браузера. Действие нельзя отменить."
        confirmLabel="Очистить"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          clear();
          setConfirmOpen(false);
          notify("Избранное очищено");
        }}
      />
    </>
  );
}
