import { describe, expect, it } from "vitest";
import { AicArtworkProvider } from "@/lib/api/aic/client";
import {
  buildAicIiifBase,
  buildAicProxyUrl,
  buildIiifImageUrl,
  snapAicWidth,
} from "@/lib/api/aic/image";
import {
  normalizeAicArtwork,
  normalizeAicImage,
  normalizeAicSummary,
} from "@/lib/api/aic/normalize";
import { aicDetailResponseSchema, aicSearchResponseSchema } from "@/lib/api/aic/schemas";
import detailFixture from "../fixtures/aic-artwork-16568.json";
import searchFixture from "../fixtures/aic-search-water.json";
import { jsonResponse } from "./helpers";

const detail = aicDetailResponseSchema.parse(detailFixture);

describe("AIC image URLs", () => {
  it("builds IIIF URLs from image configuration", () => {
    const base = buildAicIiifBase(
      "3c27b499-af56-f0d5-93b5-a7f2f1ad5813",
      "https://www.artic.edu/iiif/2/",
    );
    expect(base).toBe("https://www.artic.edu/iiif/2/3c27b499-af56-f0d5-93b5-a7f2f1ad5813");
    expect(buildIiifImageUrl(base!, 843)).toBe(`${base}/full/843,/0/default.jpg`);
  });

  it("uses the default IIIF endpoint when config is missing and rejects invalid ids", () => {
    expect(buildAicIiifBase("abcdef12-0000", null)).toBe(
      "https://www.artic.edu/iiif/2/abcdef12-0000",
    );
    expect(buildAicIiifBase(null)).toBeUndefined();
    expect(buildAicIiifBase("   ")).toBeUndefined();
    expect(buildAicIiifBase("../../etc/passwd")).toBeUndefined();
  });

  it("snaps proxy widths to the IIIF whitelist", () => {
    expect(snapAicWidth(100)).toBe(200);
    expect(snapAicWidth(640)).toBe(843);
    expect(snapAicWidth(3000)).toBe(1686);
    expect(snapAicWidth(3000, 843)).toBe(843);
    expect(buildAicProxyUrl("abc", 500)).toBe("/api/images/aic/abc/843");
  });

  it("returns no image when image_id is absent", () => {
    expect(
      normalizeAicImage({
        image_id: null,
        thumbnail: null,
        title: "X",
        artist_title: null,
        is_public_domain: true,
      }),
    ).toBeUndefined();
  });

  it("creates thumbnail, detail and large renditions with aspect ratio", () => {
    const image = normalizeAicImage(detail.data, detail.config)!;
    expect(image.thumbnailUrl).toBe("/api/images/aic/3c27b499-af56-f0d5-93b5-a7f2f1ad5813/400");
    expect(image.url).toBe("/api/images/aic/3c27b499-af56-f0d5-93b5-a7f2f1ad5813/843");
    expect(image.largeUrl).toBe("/api/images/aic/3c27b499-af56-f0d5-93b5-a7f2f1ad5813/1686");
    expect(image.iiifUrl).toBe("https://www.artic.edu/iiif/2/3c27b499-af56-f0d5-93b5-a7f2f1ad5813");
    expect(image.width).toBe(843);
    expect(image.height).toBeGreaterThan(700);
    expect(image.alt).toMatch(/water lilies/i);
    expect(image.placeholder).toMatch(/^data:image\//);
  });

  it("limits non-public-domain works to 843px", () => {
    const image = normalizeAicImage({ ...detail.data, is_public_domain: false }, detail.config)!;
    expect(image.largeUrl).toMatch(/\/843$/);
    expect(image.rights).toBeUndefined();
  });
});

describe("normalizeAicArtwork", () => {
  it("maps the museum record into the domain model", () => {
    const artwork = normalizeAicArtwork(detail.data, detail.config);
    expect(artwork).toMatchObject({
      id: "16568",
      source: "aic",
      sourceLabel: "Art Institute of Chicago",
      sourceUrl: "https://www.artic.edu/artworks/16568",
      title: "Water Lilies",
      artistName: "Claude Monet",
      dateDisplay: "1906",
      style: "Impressionism",
      medium: "Oil on canvas",
      isPublicDomain: true,
      accessionNumber: "1933.1157",
      placeOfOrigin: "France",
    });
    expect(artwork.description?.format).toBe("html");
    expect(artwork.description?.content).not.toMatch(/<script/i);
    expect(artwork.textLicense).toContain("CC BY 4.0");
    expect(artwork.inscriptions.length).toBeGreaterThan(0);
    expect(artwork.tags).not.toContain("painting");
  });

  it("never outputs undefined-like strings for empty fields", () => {
    const artwork = normalizeAicArtwork({
      id: 1,
      title: "  ",
      artist_title: "null",
      date_display: "",
      description: null,
      image_id: null,
    });
    expect(artwork.title).toBe("Без названия");
    expect(artwork.artistName).toBeUndefined();
    expect(artwork.dateDisplay).toBeUndefined();
    expect(artwork.image).toBeUndefined();
    expect(artwork.description).toBeUndefined();
    expect(JSON.stringify(artwork)).not.toContain("undefined");
  });

  it("normalizes search results", () => {
    const parsed = aicSearchResponseSchema.parse(searchFixture);
    const items = parsed.data.map((record) => normalizeAicSummary(record, parsed.config));
    expect(items[0]?.title).toBe("Water Lilies");
    expect(items.every((item) => item.source === "aic")).toBe(true);
  });
});

describe("AicArtworkProvider", () => {
  it("searches with a painting filter and bool_prefix query", async () => {
    let body: Record<string, unknown> = {};
    const provider = new AicArtworkProvider({
      baseUrl: "https://aic.test/api/v1",
      fetchImpl: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return jsonResponse(searchFixture);
      },
    });
    const result = await provider.search("water lil", {
      limit: 4,
      hasImage: true,
      publicDomain: true,
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).toContain('"artwork_type_id":1');
    expect(JSON.stringify(body)).toContain('"exists":{"field":"image_id"}');
    expect(JSON.stringify(body)).toContain('"is_public_domain":true');
    expect(JSON.stringify(body)).toContain("bool_prefix");
  });

  it("returns null for missing records", async () => {
    const provider = new AicArtworkProvider({
      baseUrl: "https://aic.test/api/v1",
      fetchImpl: async () => jsonResponse({ status: 404 }, 404),
    });
    await expect(provider.getById("999")).resolves.toBeNull();
  });
});
