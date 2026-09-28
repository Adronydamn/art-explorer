import { z } from "zod";
import { fetchJson } from "@/lib/api/http";
import { getServerEnv } from "@/lib/env";
import type { Translator } from "./types";

const yandexResponseSchema = z.object({
  translations: z.array(
    z.object({
      text: z.string(),
      detectedLanguageCode: z.string().optional(),
    }),
  ),
});

/** Yandex Cloud Translate v2 limit: total characters per request. */
const MAX_REQUEST_CHARS = 9_000;
/** Largest single text the API accepts without splitting. */
const MAX_TEXT_CHARS = 9_000;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

type SplitPiece = { text: string; separator: string };
type RequestItem = { text: string; index: number; separator: string };

export class YandexTranslator implements Translator {
  private readonly apiKey: string;
  private readonly folderId?: string;
  private readonly url: string;

  constructor() {
    const env = getServerEnv();
    if (!env.YANDEX_TRANSLATE_API_KEY) {
      throw new Error("YANDEX_TRANSLATE_API_KEY is not configured");
    }
    this.apiKey = env.YANDEX_TRANSLATE_API_KEY;
    this.folderId = env.YANDEX_TRANSLATE_FOLDER_ID;
    this.url = env.YANDEX_TRANSLATE_URL;
  }

  isAvailable(): boolean {
    return true;
  }

  async translate(texts: string[], from = "en", to = "ru", signal?: AbortSignal): Promise<string[]> {
    if (texts.length === 0) return [];

    const items: RequestItem[] = texts.flatMap((text, index) =>
      this.splitLongText(text).map((piece) => ({ text: piece.text, index, separator: piece.separator })),
    );

    const chunks = this.chunkItems(items, MAX_REQUEST_CHARS);
    const outputs = new Array<string>(texts.length).fill("");

    for (const chunk of chunks) {
      const translated = await this.translateChunk(
        chunk.map((item) => item.text),
        from,
        to,
        signal,
      );
      chunk.forEach((item, i) => {
        const text = translated[i] ?? "";
        const existing = outputs[item.index];
        outputs[item.index] = existing ? `${existing}${item.separator}${text}` : text;
      });
    }

    return outputs.map((value, index) => (value.trim() ? value.trim() : texts[index] ?? ""));
  }

  dispose(): void {
    // No persistent resources.
  }

  private splitLongText(text: string): SplitPiece[] {
    if (text.length <= MAX_TEXT_CHARS) return [{ text, separator: "" }];

    // First try to split by paragraphs.
    const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
    if (paragraphs.length > 1 && paragraphs.every((p) => p.length <= MAX_TEXT_CHARS)) {
      return paragraphs.map((p, i) => ({ text: p, separator: i > 0 ? "\n\n" : "" }));
    }

    // Then try sentences.
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const result: SplitPiece[] = [];
    let current = "";
    for (const sentence of sentences) {
      if (current.length + sentence.length + 1 > MAX_TEXT_CHARS) {
        if (current) result.push({ text: current.trim(), separator: result.length > 0 ? " " : "" });
        if (sentence.length > MAX_TEXT_CHARS) {
          const sized = this.splitBySize(sentence, MAX_TEXT_CHARS);
          sized.forEach((chunk) =>
            result.push({ text: chunk, separator: "" }),
          );
          current = "";
        } else {
          current = sentence;
        }
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current) result.push({ text: current.trim(), separator: result.length > 0 ? " " : "" });
    return result.length > 0 ? result : this.splitBySize(text, MAX_TEXT_CHARS).map((chunk) => ({ text: chunk, separator: "" }));
  }

  private splitBySize(text: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      const chunk = text.slice(i, i + size).trim();
      if (chunk) chunks.push(chunk);
    }
    return chunks.length > 0 ? chunks : [text];
  }

  private chunkItems<T extends { text: string }>(items: T[], maxChars: number): T[][] {
    const chunks: T[][] = [];
    let current: T[] = [];
    let currentLength = 0;

    for (const item of items) {
      const itemLength = item.text.length;
      if (currentLength + itemLength > maxChars && current.length > 0) {
        chunks.push(current);
        current = [item];
        currentLength = itemLength;
      } else {
        current.push(item);
        currentLength += itemLength;
      }
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  private async translateChunk(texts: string[], from: string, to: string, signal?: AbortSignal): Promise<string[]> {
    const body = {
      folderId: this.folderId,
      sourceLanguageCode: from,
      targetLanguageCode: to,
      format: "PLAIN_TEXT",
      texts,
    };

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetchJson({
          service: "yandex-translate",
          url: this.url,
          schema: yandexResponseSchema,
          init: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Api-Key ${this.apiKey}`,
            },
            body: JSON.stringify(body),
          },
          timeoutMs: REQUEST_TIMEOUT_MS,
          signal,
        });

        return response.translations.map((translation) => translation.text);
      } catch (error) {
        lastError = error;
        if (signal?.aborted) break;
        // Wait before retry on temporary failures.
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Yandex Translate request failed: ${message}`);
  }
}

export function isYandexConfigured(): boolean {
  try {
    return Boolean(getServerEnv().YANDEX_TRANSLATE_API_KEY);
  } catch {
    return false;
  }
}
