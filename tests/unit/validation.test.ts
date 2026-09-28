import { describe, expect, it } from "vitest";
import {
  artworkParamsSchema,
  MAX_QUERY_LENGTH,
  pageParamsToObject,
  searchParamsSchema,
  searchParamsToObject,
} from "@/lib/validation/schemas";

describe("search params", () => {
  it("trims and collapses whitespace, applies defaults", () => {
    const result = searchParamsSchema.parse({ q: "  Water   Lilies " });
    expect(result).toEqual({
      q: "Water Lilies",
      source: "all",
      hasImage: false,
      publicDomain: false,
      page: 1,
    });
  });

  it("parses filters", () => {
    const result = searchParamsSchema.parse(
      searchParamsToObject(
        new URLSearchParams("q=monet&source=cma&hasImage=true&publicDomain=1&page=2&limit=4"),
      ),
    );
    expect(result).toMatchObject({
      source: "cma",
      hasImage: true,
      publicDomain: true,
      page: 2,
      limit: 4,
    });
  });

  it("rejects too short and too long queries", () => {
    expect(searchParamsSchema.safeParse({ q: " a " }).success).toBe(false);
    const long = searchParamsSchema.safeParse({ q: "x".repeat(MAX_QUERY_LENGTH + 1) });
    expect(long.success).toBe(false);
    expect(long.error?.issues[0]?.message).toContain(String(MAX_QUERY_LENGTH));
    expect(searchParamsSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown sources and invalid pages", () => {
    expect(searchParamsSchema.safeParse({ q: "monet", source: "artsy" }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ q: "monet", page: "0" }).success).toBe(false);
  });

  it("normalizes page searchParams arrays", () => {
    expect(pageParamsToObject({ q: ["a", "b"], x: undefined, y: "1" })).toEqual({ q: "a", y: "1" });
  });
});

describe("artwork path params", () => {
  it("accepts valid ids per source", () => {
    expect(artworkParamsSchema.safeParse({ source: "aic", id: "16568" }).success).toBe(true);
    expect(artworkParamsSchema.safeParse({ source: "cma", id: "136510" }).success).toBe(true);
    expect(artworkParamsSchema.safeParse({ source: "cma", id: "1960.81" }).success).toBe(true);
  });

  it("rejects malformed ids and sources", () => {
    expect(artworkParamsSchema.safeParse({ source: "aic", id: "abc" }).success).toBe(false);
    expect(artworkParamsSchema.safeParse({ source: "aic", id: "../1" }).success).toBe(false);
    expect(artworkParamsSchema.safeParse({ source: "cma", id: "a/b" }).success).toBe(false);
    expect(artworkParamsSchema.safeParse({ source: "met", id: "1" }).success).toBe(false);
  });
});
