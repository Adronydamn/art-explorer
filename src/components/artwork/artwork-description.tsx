"use client";

import { useEffect, useState } from "react";
import type { Artwork } from "@/lib/artwork/types";

export const NO_DESCRIPTION_TEXT =
  "Для этой работы подробное кураторское описание в открытых данных не найдено. Ниже приведены подтверждённые сведения из музейного каталога и доступный исторический контекст.";

type TranslatedDetails = {
  description?: Artwork["description"];
  shortDescription?: string;
  commentary?: string;
  didYouKnow?: string;
  provenance?: string;
  exhibitionHistory?: string;
  publicationHistory?: string;
};

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
    </>
  );
}

function SourceNote({ children }: { children: string }) {
  return <p className="mt-3 text-xs text-ink-subtle">{children}</p>;
}

function Collapsible({ title, text, source }: { title: string; text: string; source: string }) {
  return (
    <details className="group border-b border-line py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <span
          aria-hidden
          className="text-ink-subtle transition-transform duration-(--duration-base) group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="prose-museum pb-5 text-sm text-ink-muted">
        <Paragraphs text={text} />
        <SourceNote>{`Источник: ${source}`}</SourceNote>
      </div>
    </details>
  );
}

function TranslationLoader() {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-subtle" aria-live="polite">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" />
      Перевод подробных сведений загружается…
    </span>
  );
}

/**
 * "About the work": long museum prose is translated lazily so the main page render is not blocked.
 * The initial server render shows the original English text; the client fetches the Russian translation
 * and replaces it without a hydration mismatch.
 */
export function ArtworkDescription({ artwork }: { artwork: Artwork }) {
  const source = artwork.sourceLabel;
  const [details, setDetails] = useState<TranslatedDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const path = `/api/artworks/${artwork.source}/${encodeURIComponent(artwork.id)}/details-translated`;
    fetch(path)
      .then(async (response) => (response.ok ? ((await response.json()) as TranslatedDetails) : null))
      .then((data) => {
        if (!cancelled && data) setDetails(data);
      })
      .catch(() => {
        // Leave the original English text visible if translation fails.
      })
      .finally(() => setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [artwork.source, artwork.id]);

  const display = { ...artwork, ...details };
  const hasMainText = Boolean(
    display.description || display.shortDescription || display.commentary || display.didYouKnow,
  );

  return (
    <section aria-labelledby="about-heading" className="border-t border-ink pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="about-heading" className="font-display text-3xl font-semibold">
          О произведении
        </h2>
        {isLoading && <TranslationLoader />}
      </div>

      {!hasMainText && <p className="mt-5 max-w-prose text-ink-muted">{NO_DESCRIPTION_TEXT}</p>}

      {display.shortDescription && (
        <div className="mt-6">
          <h3 className="label mb-2">Краткое описание музея</h3>
          <p className="max-w-prose font-display text-xl leading-snug">{display.shortDescription}</p>
        </div>
      )}

      {display.description && (
        <div className="mt-6">
          <h3 className="label mb-3">Музейное описание</h3>
          {display.description.format === "html" ? (
            <div
              className="prose-museum"
              // Sanitized with DOMPurify (strict allowlist) in the adapter before reaching the UI.
              dangerouslySetInnerHTML={{ __html: display.description.content }}
            />
          ) : (
            <div className="prose-museum">
              <Paragraphs text={display.description.content} />
            </div>
          )}
          <SourceNote>{artwork.textLicense ?? `Источник: ${source}`}</SourceNote>
        </div>
      )}

      {display.commentary && (
        <div className="mt-6">
          <h3 className="label mb-3">Комментарий музея</h3>
          <div className="prose-museum">
            <Paragraphs text={display.commentary} />
          </div>
          <SourceNote>{`Источник: ${source}`}</SourceNote>
        </div>
      )}

      {display.didYouKnow && (
        <aside className="mt-6 max-w-prose border-l-2 border-ochre pl-4">
          <h3 className="label mb-1">Знаете ли вы? — заметка музея</h3>
          <p>{display.didYouKnow}</p>
          <SourceNote>{`Источник: ${source}`}</SourceNote>
        </aside>
      )}

      {(display.provenance || display.exhibitionHistory || display.publicationHistory) && (
        <div className="mt-8 max-w-prose border-t border-line">
          {display.provenance && (
            <Collapsible
              title="Провенанс (история владения)"
              text={display.provenance}
              source={source}
            />
          )}
          {display.exhibitionHistory && (
            <Collapsible
              title="История выставок"
              text={display.exhibitionHistory}
              source={source}
            />
          )}
          {display.publicationHistory && (
            <Collapsible title="Публикации" text={display.publicationHistory} source={source} />
          )}
        </div>
      )}
    </section>
  );
}
