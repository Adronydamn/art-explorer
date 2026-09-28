import { describe, expect, it } from "vitest";
import {
  addFavorite,
  favoriteKey,
  type FavoriteArtwork,
  hasFavorite,
  MAX_FAVORITES,
  parseFavorites,
  removeFavorite,
} from "@/lib/favorites/store";

const monet: FavoriteArtwork = {
  source: "aic",
  id: "16568",
  title: "Water Lilies",
  artistName: "Claude Monet",
  dateDisplay: "1906",
  museum: "Art Institute of Chicago",
  sourceUrl: "https://www.artic.edu/artworks/16568",
  thumbnail: {
    url: "/api/images/aic/abc/400",
    iiifUrl: "https://www.artic.edu/iiif/2/abc",
    alt: "Pond",
  },
  savedAt: "2026-01-01T00:00:00.000Z",
};

const church: FavoriteArtwork = {
  source: "cma",
  id: "141639",
  title: "Twilight in the Wilderness",
  sourceUrl: "https://clevelandart.org/art/1965.233",
  savedAt: "2026-01-02T00:00:00.000Z",
};

describe("favorites store", () => {
  it("adds items to the top without duplicates", () => {
    const once = addFavorite([], monet);
    const twice = addFavorite(once, monet);
    const both = addFavorite(twice, church);
    expect(twice).toHaveLength(1);
    expect(both.map(favoriteKey)).toEqual(["cma:141639", "aic:16568"]);
  });

  it("removes and checks items by key", () => {
    const list = addFavorite(addFavorite([], monet), church);
    expect(hasFavorite(list, "aic:16568")).toBe(true);
    const removed = removeFavorite(list, "aic:16568");
    expect(hasFavorite(removed, "aic:16568")).toBe(false);
    expect(removed).toHaveLength(1);
  });

  it("parses stored data safely", () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites("not json")).toEqual([]);
    expect(parseFavorites('{"a":1}')).toEqual([]);
    const raw = JSON.stringify([monet, { source: "artsy", id: "x" }, monet, church]);
    expect(parseFavorites(raw).map(favoriteKey)).toEqual(["aic:16568", "cma:141639"]);
  });

  it("rejects unsafe thumbnail URLs", () => {
    const raw = JSON.stringify([{ ...monet, thumbnail: { url: "javascript:alert(1)", alt: "x" } }]);
    expect(parseFavorites(raw)).toEqual([]);
  });

  it("stores only minimal metadata", () => {
    const withExtra = { ...monet, rawMetadata: { huge: "x".repeat(1000) } } as FavoriteArtwork;
    const [stored] = addFavorite([], withExtra);
    expect(stored).not.toHaveProperty("rawMetadata");
  });

  it("caps the list size", () => {
    let list: FavoriteArtwork[] = [];
    for (let index = 0; index < MAX_FAVORITES + 5; index += 1) {
      list = addFavorite(list, { ...church, id: String(index) });
    }
    expect(list).toHaveLength(MAX_FAVORITES);
  });
});
