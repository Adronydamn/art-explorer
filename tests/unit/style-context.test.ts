import { describe, expect, it } from "vitest";
import {
  buildStyleCandidates,
  buildStyleContext,
  canClaimStyle,
  cleanPeriod,
  confidenceFor,
  contextHeading,
  type StyleContextInput,
} from "@/lib/artwork/style-context";

const base: StyleContextInput = {
  source: "aic",
  sourceLabel: "Art Institute of Chicago",
  alternateStyles: [],
  subjects: [],
  tags: [],
};

const article = {
  title: "Импрессионизм",
  lang: "ru" as const,
  url: "https://ru.wikipedia.org/wiki/X",
  extract: "Текст",
};

describe("buildStyleCandidates", () => {
  it("uses only the museum style when it is stated", () => {
    const candidates = buildStyleCandidates({
      ...base,
      style: "Impressionism",
      artistName: "Claude Monet",
      medium: "Oil on canvas",
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: "style",
      museumValue: "Impressionism",
      basis: "explicit",
    });
    expect(candidates[0]?.evidence).toEqual([
      { field: "style", value: "Impressionism", source: "Art Institute of Chicago" },
    ]);
  });

  it("falls back to the period and strips dates", () => {
    const candidates = buildStyleCandidates({
      ...base,
      source: "cma",
      sourceLabel: "Cleveland Museum of Art",
      period: "Edo period (1615–1868)",
    });
    expect(candidates[0]).toMatchObject({
      kind: "period",
      searchTerms: ["Edo period"],
      basis: "explicit",
    });
    expect(cleanPeriod("Ming dynasty (1368-1644)")).toBe("Ming dynasty");
  });

  it("orders reference candidates: corroborated tag → artist → genre → technique → culture", () => {
    const candidates = buildStyleCandidates({
      ...base,
      classification: "painting",
      tags: ["Pointillism", "landscapes"],
      subjects: ["landscapes"],
      genre: "landscapes",
      artistName: "Georges Seurat",
      artistDisplay: "Georges Seurat (French, 1859–1891)",
      medium: "Oil on canvas",
      culture: "France, 19th century",
    });
    expect(candidates.map((candidate) => candidate.kind)).toEqual([
      "style",
      "artist",
      "genre",
      "technique",
      "culture",
    ]);
    expect(candidates[0]).toMatchObject({ museumValue: "Pointillism", basis: "corroborated" });
    expect(candidates[0]?.evidence.length).toBeGreaterThanOrEqual(2);
    expect(candidates.find((candidate) => candidate.kind === "genre")?.searchTerms).toEqual([
      "Landscape painting",
    ]);
    expect(candidates.find((candidate) => candidate.kind === "technique")?.searchTerms).toEqual([
      "Oil painting",
    ]);
    expect(candidates.find((candidate) => candidate.kind === "culture")?.searchTerms).toEqual([
      "Art of France",
    ]);
  });

  it("never derives candidates from the artwork title or unknown artists", () => {
    const candidates = buildStyleCandidates({ ...base, artistName: "Unknown artist" });
    expect(candidates).toEqual([]);
  });

  it("every candidate carries museum evidence", () => {
    const candidates = buildStyleCandidates({
      ...base,
      artistName: "Claude Monet",
      medium: "tempera on panel",
      culture: "Japan",
    });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.evidence.length > 0)).toBe(true);
  });
});

describe("confidence", () => {
  const [explicit] = buildStyleCandidates({ ...base, style: "Impressionism" });
  const [corroborated] = buildStyleCandidates({
    ...base,
    classification: "painting",
    tags: ["Pointillism"],
  });
  const [artist] = buildStyleCandidates({ ...base, artistName: "Claude Monet" });

  it("high: explicit museum style + matching article", () => {
    expect(confidenceFor(explicit!, true)).toBe("high");
  });

  it("medium: explicit style without article, or corroborated tag with article", () => {
    expect(confidenceFor(explicit!, false)).toBe("medium");
    expect(confidenceFor(corroborated!, true)).toBe("medium");
  });

  it("low: author / technique / genre / culture material", () => {
    expect(confidenceFor(artist!, true)).toBe("low");
    expect(confidenceFor(corroborated!, false)).toBe("low");
  });
});

describe("buildStyleContext", () => {
  it("builds a Wikipedia-backed context with attribution and museum evidence", () => {
    const [candidate] = buildStyleCandidates({ ...base, style: "Impressionism" });
    const context = buildStyleContext(candidate!, article, "found");
    expect(context).toMatchObject({
      sourceName: "Wikipedia",
      sourceLanguage: "ru",
      confidence: "high",
      wikipediaTitle: "Импрессионизм",
      referenceStatus: "found",
    });
    expect(context.attribution).toContain("CC BY-SA");
    expect(context.museumEvidence.length).toBeGreaterThan(0);
    expect(contextHeading(context)).toBe("Стиль и контекст");
    expect(canClaimStyle(context)).toBe(true);
  });

  it("requires museum evidence", () => {
    const [candidate] = buildStyleCandidates({ ...base, style: "Impressionism" });
    expect(() => buildStyleContext({ ...candidate!, evidence: [] }, article, "found")).toThrow();
  });

  it("chooses headings from what the museum confirmed and never claims style at low confidence", () => {
    const [artist] = buildStyleCandidates({ ...base, artistName: "Claude Monet" });
    const artistContext = buildStyleContext(artist!, article, "found");
    expect(contextHeading(artistContext)).toBe("Контекст об авторе");
    expect(canClaimStyle(artistContext)).toBe(false);

    const [period] = buildStyleCandidates({ ...base, period: "Edo period" });
    expect(contextHeading(buildStyleContext(period!, null, "not-found"))).toBe(
      "Исторический контекст",
    );

    const [technique] = buildStyleCandidates({ ...base, medium: "Oil on canvas" });
    expect(contextHeading(buildStyleContext(technique!, article, "found"))).toBe("Техника и жанр");

    const [culture] = buildStyleCandidates({ ...base, culture: "Japan" });
    expect(contextHeading(buildStyleContext(culture!, article, "found"))).toBe(
      "Культурный контекст",
    );

    const [tag] = buildStyleCandidates({
      ...base,
      classification: "painting",
      tags: ["Pointillism"],
    });
    expect(contextHeading({ ...buildStyleContext(tag!, null, "not-found") })).toBe(
      "Дополнительный контекст",
    );
    expect(contextHeading(null)).toBe("Контекст");
  });
});
