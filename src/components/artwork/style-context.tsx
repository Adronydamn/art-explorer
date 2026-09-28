import { BookOpen, ExternalLink, Landmark } from "lucide-react";
import { linkStyle } from "@/components/ui/styles";
import { canClaimStyle, contextHeading, evidenceLabel } from "@/lib/artwork/style-context";
import type { Artwork, StyleContext, StyleContextResult } from "@/lib/artwork/types";
import { getStyleContext } from "@/lib/services/artworks";

export const NO_STYLE_TEXT =
  "Для этой работы в подключённых музейных данных нет надёжно подтверждённой стилевой классификации. Изучите технику, дату, автора и описание из музейного каталога.";
export const WIKI_UNAVAILABLE_TEXT =
  "Энциклопедическая справка временно недоступна. Музейные сведения о произведении остаются доступны.";
export const WIKI_NOT_FOUND_TEXT = "Справочная статья для этого направления пока не найдена.";
export const ENGLISH_ONLY_TEXT = "Справка доступна на английском языке.";

const KIND_LABELS: Record<StyleContext["kind"], string> = {
  style: "Стиль / направление",
  period: "Период",
  artist: "Автор",
  technique: "Техника",
  genre: "Жанр",
  culture: "Культура",
};

function Badge({ tone, children }: { tone: "museum" | "reference"; children: string }) {
  return (
    <span
      className={
        tone === "museum"
          ? "inline-flex items-center gap-1 rounded-xs bg-verdigris-soft px-2 py-1 text-2xs font-medium tracking-wide text-verdigris uppercase"
          : "inline-flex items-center gap-1 rounded-xs bg-ochre-soft px-2 py-1 text-2xs font-medium tracking-wide text-ink uppercase"
      }
    >
      {tone === "museum" ? (
        <Landmark aria-hidden className="size-3" />
      ) : (
        <BookOpen aria-hidden className="size-3" />
      )}
      {children}
    </span>
  );
}

function Evidence({ context }: { context: StyleContext }) {
  return (
    <div className="mt-6 border-t border-line pt-4">
      <h3 className="label mb-2">На основании музейных данных</h3>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {context.museumEvidence.map((item) => (
          <div key={`${item.field}:${item.value}`} className="contents">
            <dt className="text-ink-subtle">{evidenceLabel(item.field)}</dt>
            <dd className="text-ink">
              {item.value} <span className="text-xs text-ink-subtle">— {item.source}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function StyleContextView({ result }: { result: StyleContextResult }) {
  const { context, wikipediaUnavailable } = result;
  const heading = contextHeading(context);
  const claimsStyle = canClaimStyle(context);

  return (
    <section
      aria-labelledby="context-heading"
      className="relative overflow-hidden rounded-md bg-paper-sunk px-5 py-8 sm:px-10 sm:py-12"
    >
      <span aria-hidden className="absolute top-0 left-0 h-1 w-24 bg-ochre" />
      <p className="label">Контекст для изучения</p>
      <h2 id="context-heading" className="mt-2 font-display text-4xl font-semibold">
        {heading}
      </h2>

      {!context ? (
        <p className="mt-5 max-w-prose text-ink-muted">
          {wikipediaUnavailable ? WIKI_UNAVAILABLE_TEXT : NO_STYLE_TEXT}
        </p>
      ) : (
        <div className="mt-6">
          {context.primaryLabel && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-display text-3xl text-accent italic">{context.primaryLabel}</p>
              <Badge tone="museum">{claimsStyle ? "Музейная классификация" : "Данные музея"}</Badge>
            </div>
          )}
          <p className="mt-1 text-xs text-ink-subtle">
            {KIND_LABELS[context.kind]} · указано в каталоге {context.museumEvidence[0]?.source}
          </p>

          {context.summary ? (
            <div className="mt-6 max-w-prose">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="reference">Справочный контекст</Badge>
                <span className="text-xs text-ink-subtle">
                  Wikipedia · {context.sourceLanguage === "ru" ? "на русском" : "на английском"}
                  {context.wikipediaTitle ? ` · «${context.wikipediaTitle}»` : ""}
                </span>
              </div>
              {context.sourceLanguage === "en" && (
                <p className="mb-3 text-sm font-medium text-ink-muted">{ENGLISH_ONLY_TEXT}</p>
              )}
              <blockquote
                lang={context.sourceLanguage}
                cite={context.sourceUrl}
                className="border-l-2 border-line-strong pl-4 text-base leading-relaxed"
              >
                {context.summary.split(/\n+/).map((paragraph, index) => (
                  <p key={index} className={index > 0 ? "mt-3" : undefined}>
                    {paragraph}
                  </p>
                ))}
              </blockquote>
              {context.sourceUrl && (
                <a
                  href={context.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkStyle} mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm`}
                >
                  Подробнее в Wikipedia
                  <ExternalLink aria-hidden className="size-3.5" />
                  <span className="sr-only">(откроется в новой вкладке)</span>
                </a>
              )}
              <p className="mt-2 text-xs text-ink-subtle">{context.attribution}</p>
            </div>
          ) : (
            <p className="mt-5 max-w-prose text-ink-muted">
              {context.referenceStatus === "unavailable"
                ? WIKI_UNAVAILABLE_TEXT
                : WIKI_NOT_FOUND_TEXT}
            </p>
          )}

          {context.relatedTerms.length > 0 && (
            <p className="mt-5 text-sm text-ink-muted">
              Также в каталоге: <span className="text-ink">{context.relatedTerms.join(", ")}</span>
            </p>
          )}

          <Evidence context={context} />
        </div>
      )}
    </section>
  );
}

/** Streams in after the museum data; Wikipedia problems never break the page. */
export async function StyleContextSection({ artwork }: { artwork: Artwork }) {
  const result = await getStyleContext(artwork);
  return <StyleContextView result={result} />;
}

export function StyleContextSkeleton() {
  return (
    <div
      role="status"
      aria-label="Загружаем справочный контекст"
      className="rounded-md bg-paper-sunk px-5 py-8 sm:px-10 sm:py-12"
    >
      <div className="skeleton h-3 w-32" />
      <div className="skeleton mt-4 h-9 w-2/3 max-w-md" />
      <div className="mt-8 max-w-prose space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-4/5" />
      </div>
    </div>
  );
}
