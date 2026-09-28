import { NextResponse } from "next/server";
import type { z } from "zod";
import { clientKey, RateLimiter } from "./rate-limit";

export type ApiErrorCode =
  "invalid_request" | "not_found" | "rate_limited" | "upstream_unavailable" | "internal_error";

export type ApiErrorBody = { error: { code: ApiErrorCode; message: string; details?: string[] } };

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  init?: { details?: string[]; headers?: HeadersInit },
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(init?.details ? { details: init.details } : {}) } },
    { status, headers: { "Cache-Control": "no-store", ...init?.headers } },
  );
}

export function validationError(error: z.ZodError): NextResponse<ApiErrorBody> {
  return jsonError(400, "invalid_request", "Некорректные параметры запроса", {
    details: error.issues.map((issue) => issue.message),
  });
}

export function cacheHeaders(maxAgeSeconds: number, staleSeconds = maxAgeSeconds): HeadersInit {
  return {
    "Cache-Control": `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleSeconds}`,
  };
}

/** Public proxy endpoints: 60 request burst, 2 requests/second sustained per client. */
const limiter = new RateLimiter({ capacity: 60, refillPerSecond: 2 });

export function checkRateLimit(request: Request): NextResponse<ApiErrorBody> | null {
  const { allowed, retryAfter } = limiter.consume(clientKey(request.headers));
  if (allowed) return null;
  return jsonError(429, "rate_limited", "Слишком много запросов. Попробуйте немного позже.", {
    headers: { "Retry-After": String(retryAfter) },
  });
}
