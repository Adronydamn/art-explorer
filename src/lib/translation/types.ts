/** Minimal translator interface used by the artwork service layer. */
export interface Translator {
  /** Returns the translated strings in the same order as the input. */
  translate(texts: string[], from?: string, to?: string): Promise<string[]>;

  /** Whether the translator is operational. */
  isAvailable(): boolean;

  /** Release any resources (worker processes, file handles, etc.). */
  dispose(): Promise<void> | void;
}
