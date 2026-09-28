import type { z } from "zod";
import { getServerEnv } from "@/lib/env";

export type UpstreamErrorKind =
  "not_found" | "rate_limited" | "server" | "client" | "timeout" | "network" | "invalid_response";

/** Error thrown by adapters when an external API call fails. Messages never contain secrets. */
export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind;
  readonly service: string;
  readonly status?: number;

  constructor(service: string, kind: UpstreamErrorKind, message: string, status?: number) {
    super(`[${service}] ${message}`);
    this.name = "UpstreamError";
    this.service = service;
    this.kind = kind;
    this.status = status;
  }

  /** Temporary failures: the service may work again later. */
  get isTemporary(): boolean {
    return (
      this.kind === "rate_limited" ||
      this.kind === "server" ||
      this.kind === "timeout" ||
      this.kind === "network"
    );
  }
}

export type FetchJsonOptions<T> = {
  service: string;
  url: string;
  schema: z.ZodType<T>;
  init?: RequestInit;
  timeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
};

function statusToKind(status: number): UpstreamErrorKind {
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "client";
}

/**
 * Fetches JSON with a timeout, maps HTTP failures to typed errors and validates the payload
 * with a Zod schema.
 */
export async function fetchJson<T>({
  service,
  url,
  schema,
  init,
  timeoutMs,
  signal,
  fetchImpl = fetch,
}: FetchJsonOptions<T>): Promise<T> {
  const timeout = timeoutMs ?? getServerEnv().EXTERNAL_API_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeout);
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
      signal: combined,
      cache: "no-store",
    });
  } catch (error) {
    if (timeoutSignal.aborted)
      throw new UpstreamError(service, "timeout", `Timed out after ${timeout}ms`);
    if (signal?.aborted) throw error;
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause : undefined;
    const code =
      cause && "code" in cause
        ? String(cause.code)
        : (cause?.name ?? (error instanceof Error ? error.name : "unknown"));
    throw new UpstreamError(service, "network", `Network request failed (${code})`);
  }

  if (!response.ok) {
    throw new UpstreamError(
      service,
      statusToKind(response.status),
      `HTTP ${response.status}`,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UpstreamError(service, "invalid_response", "Response is not valid JSON");
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new UpstreamError(
      service,
      "invalid_response",
      "Response does not match the expected schema",
    );
  }
  return parsed.data;
}

/** Server-side logging without leaking stack traces to clients. */
export function logServerError(scope: string, error: unknown): void {
  if (process.env.NODE_ENV === "test") return;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[art-explorer] ${scope}: ${message}`);
}
