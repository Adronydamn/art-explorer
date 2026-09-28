import type { StyleContextInput } from "@/lib/artwork/style-context";
import type { StyleContextResult } from "@/lib/artwork/types";

export interface StyleProvider {
  /** Never throws: failures are reported through `wikipediaUnavailable`. */
  getStyleContext(
    input: StyleContextInput,
    options?: { signal?: AbortSignal },
  ): Promise<StyleContextResult>;
}
