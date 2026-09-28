import { z } from "zod";
import { ARTWORK_SOURCES } from "@/lib/artwork/types";

export const FAVORITES_STORAGE_KEY = "art-explorer:favorites:v1";
export const MAX_FAVORITES = 500;

const favoriteSchema = z.object({
  source: z.enum(ARTWORK_SOURCES),
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(500),
  artistName: z.string().max(300).optional(),
  dateDisplay: z.string().max(120).optional(),
  museum: z.string().max(120).optional(),
  thumbnail: z
    .object({
      /** Absolute museum URL or a same-origin proxy path (/api/images/…). */
      url: z
        .string()
        .max(2000)
        .regex(/^(https?:\/\/|\/api\/images\/)/),
      iiifUrl: z.url().optional(),
      alt: z.string().max(1000),
    })
    .optional(),
  sourceUrl: z.url(),
  savedAt: z.string(),
});

export type FavoriteArtwork = z.infer<typeof favoriteSchema>;

export function favoriteKey(item: Pick<FavoriteArtwork, "source" | "id">): string {
  return `${item.source}:${item.id}`;
}

/** Parses stored JSON; invalid entries are dropped instead of breaking the page. */
export function parseFavorites(raw: string | null): FavoriteArtwork[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const result: FavoriteArtwork[] = [];
  for (const entry of data) {
    const parsed = favoriteSchema.safeParse(entry);
    if (!parsed.success) continue;
    const key = favoriteKey(parsed.data);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(parsed.data);
  }
  return result;
}

/** Adds a favorite to the top of the list; a work is never stored twice. */
export function addFavorite(
  list: readonly FavoriteArtwork[],
  item: FavoriteArtwork,
): FavoriteArtwork[] {
  const key = favoriteKey(item);
  if (list.some((entry) => favoriteKey(entry) === key)) return [...list];
  const parsed = favoriteSchema.parse(item);
  return [parsed, ...list].slice(0, MAX_FAVORITES);
}

export function removeFavorite(list: readonly FavoriteArtwork[], key: string): FavoriteArtwork[] {
  return list.filter((entry) => favoriteKey(entry) !== key);
}

export function hasFavorite(list: readonly FavoriteArtwork[], key: string): boolean {
  return list.some((entry) => favoriteKey(entry) === key);
}

/* ---------- Browser-backed store (useSyncExternalStore compatible) ---------- */

const EMPTY: FavoriteArtwork[] = [];
const CHANGE_EVENT = "art-explorer:favorites-change";

let snapshotRaw: string | null | undefined;
let snapshot: FavoriteArtwork[] = EMPTY;

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(FAVORITES_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getFavoritesSnapshot(): FavoriteArtwork[] {
  const raw = readStorage();
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = parseFavorites(raw);
  }
  return snapshot;
}

export function getServerFavoritesSnapshot(): FavoriteArtwork[] | null {
  return null;
}

export function subscribeFavorites(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === FAVORITES_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Persists the list. Returns false when storage is unavailable or full. */
export function writeFavorites(list: readonly FavoriteArtwork[]): boolean {
  try {
    if (list.length === 0) window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
    else window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}
