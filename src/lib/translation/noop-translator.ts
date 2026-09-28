import type { Translator } from "./types";

/** Falls back to the original strings when translation is disabled or unavailable. */
export class NoopTranslator implements Translator {
  translate(texts: string[]): Promise<string[]> {
    return Promise.resolve(texts);
  }

  isAvailable(): boolean {
    return false;
  }

  dispose(): void {
    // no-op
  }
}
