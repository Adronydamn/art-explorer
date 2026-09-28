"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  addFavorite,
  type FavoriteArtwork,
  getFavoritesSnapshot,
  getServerFavoritesSnapshot,
  removeFavorite,
  subscribeFavorites,
  writeFavorites,
} from "@/lib/favorites/store";

export type UseFavorites = {
  /** null until the client has read localStorage (SSR-safe hydration). */
  favorites: FavoriteArtwork[] | null;
  add: (item: FavoriteArtwork) => boolean;
  remove: (key: string) => boolean;
  clear: () => boolean;
};

export function useFavorites(): UseFavorites {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot,
  );

  const add = useCallback(
    (item: FavoriteArtwork) => writeFavorites(addFavorite(getFavoritesSnapshot(), item)),
    [],
  );
  const remove = useCallback(
    (key: string) => writeFavorites(removeFavorite(getFavoritesSnapshot(), key)),
    [],
  );
  const clear = useCallback(() => writeFavorites([]), []);

  return { favorites, add, remove, clear };
}
