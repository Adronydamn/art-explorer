import { describe, expect, it } from "vitest";
import { CmaArtworkProvider } from "@/lib/api/cma/client";
import { selectCmaImage } from "@/lib/api/cma/image";
import { cmaRights, normalizeCmaArtwork, parseCmaCreators } from "@/lib/api/cma/normalize";
import { cmaDetailResponseSchema } from "@/lib/api/cma/schemas";
import detailFixture from "../fixtures/cma-artwork-136510.json";
import searchFixture from "../fixtures/cma-search-water.json";
import { jsonResponse } from "./helpers";

const detail = cmaDetailResponseSchema.parse(detailFixture);

describe("selectCmaImage", () => {
  it("prefers print for detail and web for thumbnails, never the TIFF", () => {
    const image = selectCmaImage({
      web: { url: "https://cdn.test/a_web.jpg", width: "900", height: "419" },
      print: { url: "https://cdn.test/a_print.jpg", width: "3400", height: "1581" },
      full: { url: "https://cdn.test/a_full.tif", width: "15000", height: "7000" },
    });
    expect(image).toEqual({
      url: "https://cdn.test/a_print.jpg",
      thumbnailUrl: "https://cdn.test/a_web.jpg",
      largeUrl: "https://cdn.test/a_print.jpg",
      width: 3400,
      height: 1581,
    });
  });

  it("falls back to web and handles missing images", () => {
    expect(selectCmaImage({ web: { url: "https://cdn.test/b_web.jpg" } })?.url).toBe(
      "https://cdn.test/b_web.jpg",
    );
    expect(selectCmaImage(null)).toBeUndefined();
    expect(selectCmaImage({})).toBeUndefined();
    expect(selectCmaImage({ full: { url: "https://cdn.test/only.tif" } })).toBeUndefined();
  });
});

describe("CMA creators and rights", () => {
  it("parses different creator formats", () => {
    expect(
      parseCmaCreators([{ description: "Claude Monet (French, 1840–1926)", role: "artist" }]),
    ).toEqual({
      name: "Claude Monet",
      display: "Claude Monet (French, 1840–1926)",
    });
    expect(
      parseCmaCreators([
        { description: "Workshop of Rubens (Flemish)", qualifier: null },
        { description: "Jan Brueghel (Flemish, 1568–1625)", qualifier: "and" },
      ]).name,
    ).toBe("Workshop of Rubens, Jan Brueghel");
    expect(parseCmaCreators([])).toEqual({});
    expect(parseCmaCreators([{ description: null }])).toEqual({});
  });

  it("does not assume CC0 unless stated", () => {
    expect(cmaRights("CC0").isPublicDomain).toBe(true);
    expect(cmaRights("Copyrighted").isPublicDomain).toBe(false);
    expect(cmaRights(null)).toEqual({});
    expect(cmaRights("Something else").isPublicDomain).toBeUndefined();
  });
});

describe("normalizeCmaArtwork", () => {
  it("maps the record into the domain model", () => {
    const artwork = normalizeCmaArtwork(detail.data);
    expect(artwork).toMatchObject({
      id: "136510",
      source: "cma",
      sourceLabel: "Cleveland Museum of Art",
      sourceUrl: "https://clevelandart.org/art/1960.81",
      title: "Water Lilies (Agapanthus)",
      artistName: "Claude Monet",
      dateDisplay: "c. 1915–26",
      medium: "oil on canvas",
      artworkType: "Painting",
      accessionNumber: "1960.81",
      isPublicDomain: true,
    });
    expect(artwork.image?.url).toContain("_print.jpg");
    expect(artwork.image?.thumbnailUrl).toContain("_web.jpg");
    expect(artwork.provenance).toContain("Estate of the artist");
    expect(artwork.inscriptions[0]).toContain("Claude Monet");
    expect(artwork.culture).toContain("France");
    expect(artwork.style).toBeUndefined();
  });

  it("handles records without images", () => {
    const artwork = normalizeCmaArtwork({ ...detail.data, images: null });
    expect(artwork.image).toBeUndefined();
  });
});

describe("CmaArtworkProvider", () => {
  it("retries without the unfinished last word for prefix search", async () => {
    const requested: string[] = [];
    const provider = new CmaArtworkProvider({
      baseUrl: "https://cma.test/api",
      fetchImpl: async (input) => {
        const url = new URL(String(input));
        requested.push(url.searchParams.get("q") ?? "");
        if (url.searchParams.get("q") === "water lil")
          return jsonResponse({ info: { total: 0 }, data: [] });
        return jsonResponse(searchFixture);
      },
    });
    const result = await provider.search("water lil", { limit: 5 });
    expect(requested).toEqual(["water lil", "water"]);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => /\blil/i.test(item.title))).toBe(true);
  });

  it("passes image and CC0 filters", async () => {
    let url = "";
    const provider = new CmaArtworkProvider({
      baseUrl: "https://cma.test/api",
      fetchImpl: async (input) => {
        url = String(input);
        return jsonResponse(searchFixture);
      },
    });
    await provider.search("water lilies", { hasImage: true, publicDomain: true });
    expect(url).toContain("has_image=1");
    expect(url).toContain("cc0=1");
    expect(url).toContain("type=Painting");
  });
});
