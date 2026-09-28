"use client";

import { useEffect, useState } from "react";
import type { ArtworkSource, ArtworkSummary } from "@/lib/artwork/types";
import {
  isQueryLongEnough,
  normalizeSuggestionQuery,
  SUGGESTION_DEBOUNCE_MS,
  SuggestionsClient,
  SuggestionsError,
} from "@/lib/search/suggestions-client";
import { useDebouncedValue } from "./use-debounced-value";

export type SuggestionsState =
  | { status: "idle" }
  | { status: "too-short" }
  | { status: "loading"; items: ArtworkSummary[] }
  | {
      status: "success";
      query: string;
      items: ArtworkSummary[];
      unavailableSources: ArtworkSource[];
    }
  | { status: "error"; kind: "network" | "unavailable" };

const sharedClient = new SuggestionsClient();

type Resolved = {
  query: string;
  state: Exclude<
    SuggestionsState,
    { status: "idle" } | { status: "too-short" } | { status: "loading" }
  >;
};

/**
 * Debounced autocomplete state. Stale requests are aborted, identical queries are served
 * from a short-lived cache and never re-requested.
 */
export function useSuggestions(rawQuery: string, enabled: boolean): SuggestionsState {
  const query = normalizeSuggestionQuery(rawQuery);
  const debounced = useDebouncedValue(query, SUGGESTION_DEBOUNCE_MS);
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    if (!enabled || !isQueryLongEnough(debounced) || sharedClient.peek(debounced)) return;
    const controller = new AbortController();
    sharedClient
      .fetch(debounced, controller.signal)
      .then((payload) =>
        setResolved({
          query: debounced,
          state: { status: "success", query: debounced, ...payload },
        }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const kind = error instanceof SuggestionsError ? error.kind : "network";
        setResolved({ query: debounced, state: { status: "error", kind } });
      });
    return () => controller.abort();
  }, [debounced, enabled]);

  if (!enabled || query.length === 0) return { status: "idle" };
  if (!isQueryLongEnough(query)) return { status: "too-short" };

  const cached = sharedClient.peek(query);
  if (cached) return { status: "success", query, ...cached };
  if (resolved && resolved.query === query) return resolved.state;

  const previous = resolved?.state.status === "success" ? resolved.state.items : [];
  return { status: "loading", items: previous };
}
