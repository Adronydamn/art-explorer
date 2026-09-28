/**
 * Local mock of the external APIs (AIC, CMA, Wikipedia, image CDNs) for e2e tests.
 * Run: node --experimental-strip-types tests/e2e/mock-server.mts
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import aicDetail16568 from "../fixtures/aic-artwork-16568.json" with { type: "json" };
import aicDetail111628 from "../fixtures/aic-artwork-111628.json" with { type: "json" };
import aicSearch from "../fixtures/aic-search-water.json" with { type: "json" };
import cmaDetail136510 from "../fixtures/cma-artwork-136510.json" with { type: "json" };
import cmaSearch from "../fixtures/cma-search-water.json" with { type: "json" };
import { resolveWikipedia } from "../fixtures/wikipedia-mock.ts";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const ORIGIN = `http://localhost:${PORT}`;

/** Tiny valid PNG (1×1, warm grey) served for every artwork image. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4/+8/AAX+Av4N70a4AAAAAElFTkSuQmCC",
  "base64",
);

type Json = Record<string, unknown>;

const AIC_DETAILS: Record<string, Json> = { "16568": aicDetail16568, "111628": aicDetail111628 };
const CMA_DETAILS: Record<string, Json> = { "136510": cmaDetail136510 };

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/** Rewrites museum image hosts to this server so tests never hit the real CDNs. */
function rewriteImages<T>(value: T): T {
  const json = JSON.stringify(value)
    .replaceAll("https://www.artic.edu/iiif/2", `${ORIGIN}/iiif/2`)
    .replaceAll("https:\\/\\/www.artic.edu\\/iiif\\/2", `${ORIGIN}/iiif/2`)
    .replaceAll("https://openaccess-cdn.clevelandart.org", `${ORIGIN}/cma-img`);
  return JSON.parse(json) as T;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function matches(query: string): boolean {
  const q = query.toLowerCase();
  return ["wat", "lil", "monet", "outage"].some((term) => q.includes(term));
}

async function handleAic(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
  if (path === "/artworks/search") {
    const body = JSON.parse((await readBody(req)) || "{}") as {
      query?: {
        bool?: {
          must?: Array<{ multi_match?: { query?: string } }>;
          must_not?: Array<{ term?: { id?: number } }>;
        };
      };
    };
    const text = body.query?.bool?.must?.[0]?.multi_match?.query;
    const excluded = String(body.query?.bool?.must_not?.[0]?.term?.id ?? "");
    const data =
      text === undefined || matches(text)
        ? aicSearch.data.filter((item) => String(item.id) !== excluded)
        : [];
    send(
      res,
      200,
      rewriteImages({
        ...aicSearch,
        data,
        pagination: { ...aicSearch.pagination, total: data.length },
      }),
    );
    return;
  }
  const id = /^\/artworks\/(\d+)$/.exec(path)?.[1];
  const detail = id ? AIC_DETAILS[id] : undefined;
  if (detail) send(res, 200, rewriteImages(detail));
  else send(res, 404, { status: 404, error: "Not found" });
}

function handleCma(res: ServerResponse, path: string, params: URLSearchParams): void {
  if (path === "/artworks/" || path === "/artworks") {
    const q = params.get("q") ?? "";
    if (q.toLowerCase().includes("outage")) return send(res, 500, { error: "Internal error" });
    const data = params.has("artists") || matches(q) ? cmaSearch.data : [];
    send(res, 200, rewriteImages({ ...cmaSearch, info: { total: data.length }, data }));
    return;
  }
  const id = /^\/artworks\/([\w.-]+)$/.exec(path)?.[1];
  const detail = id ? CMA_DETAILS[id] : undefined;
  if (detail) send(res, 200, rewriteImages(detail));
  else send(res, 404, { detail: "Not found" });
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", ORIGIN);
  const { pathname } = url;

  void (async () => {
    if (pathname === "/health") return send(res, 200, { ok: true });
    if (pathname.startsWith("/iiif/") || pathname.startsWith("/cma-img/")) {
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
      res.end(PNG);
      return;
    }
    if (pathname.startsWith("/aic/api/v1"))
      return handleAic(req, res, pathname.slice("/aic/api/v1".length));
    if (pathname.startsWith("/cma/api"))
      return handleCma(res, pathname.slice("/cma/api".length), url.searchParams);
    const wiki = /^\/wiki\/(ru|en)(\/.*)$/.exec(pathname);
    if (wiki?.[1] && wiki[2]) {
      const { status, body } = resolveWikipedia(wiki[1], `${wiki[2]}${url.search}`);
      return send(res, status, body);
    }
    send(res, 404, { error: "Unknown mock route" });
  })().catch((error: unknown) => {
    console.error(error);
    send(res, 500, { error: "Mock failure" });
  });
});

server.listen(PORT, () => {
  console.log(`Mock APIs listening on ${ORIGIN}`);
});
