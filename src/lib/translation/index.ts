import { getServerEnv } from "@/lib/env";
import { NoopTranslator } from "./noop-translator";
import type { Translator } from "./types";
import { isYandexConfigured, YandexTranslator } from "./yandex-translator";

let translator: Translator | undefined;

export function getTranslator(): Translator {
  if (translator) return translator;

  const env = getServerEnv();
  if (env.TRANSLATION_ENABLED && isYandexConfigured()) {
    translator = new YandexTranslator();
  } else {
    translator = new NoopTranslator();
  }
  return translator;
}

/** For tests: reset the singleton translator instance. */
export function resetTranslator(): void {
  translator?.dispose();
  translator = undefined;
}
