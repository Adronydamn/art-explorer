import { SearchX } from "lucide-react";
import Link from "next/link";
import { ArtworkCard } from "@/components/artwork/artwork-card";
import { buttonVariants, linkStyle } from "@/components/ui/styles";
import { AllSourcesFailedError } from "@/lib/api/providers/aggregate-search";
import { logServerError } from "@/lib/api/http";
import type { AggregatedSearchResult } from "@/lib/artwork/types";
import { SOURCE_LABELS } from "@/lib/artwork/types";
import { searchArtworks } from "@/lib/services/artworks";
import type { SearchParams } from "@/lib/validation/schemas";

const PER_SOURCE = 12;

function buildHref(params: SearchParams, page: number): string {
  const search = new URLSearchParams({ q: params.q });
  if (params.source !== "all") search.set("source", params.source);
  if (params.hasImage) search.set("hasImage", "true");
  if (params.publicDomain) search.set("publicDomain", "true");
  if (page > 1) search.set("page", String(page));
  return `/search?${search.toString()}`;
}

function formatCount(total: number): string {
  const mod10 = total % 10;
  const mod100 = total % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "работа"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "работы"
        : "работ";
  return `${total.toLocaleString("ru-RU")} ${word}`;
}

export async function SearchResults({ params }: { params: SearchParams }) {
  let result: AggregatedSearchResult;
  try {
    result = await searchArtworks({
      query: params.q,
      source: params.source,
      hasImage: params.hasImage,
      publicDomain: params.publicDomain,
      page: params.page,
      perSource: PER_SOURCE,
    });
  } catch (error) {
    if (!(error instanceof AllSourcesFailedError)) logServerError("search-page", error);
    return (
      <div role="alert" className="mt-12 max-w-prose border-l-2 border-accent pl-5">
        <h2 className="font-display text-2xl font-semibold">
          Музейные источники временно недоступны
        </h2>
        <p className="mt-2 text-ink-muted">
          Мы не смогли получить ответ ни от одного музея. Попробуйте повторить поиск через минуту.
        </p>
        <Link
          href={buildHref(params, params.page)}
          className={`${buttonVariants.outline} mt-5`}
          prefetch={false}
        >
          Повторить
        </Link>
      </div>
    );
  }

  const failed = result.sources.filter((status) => !status.ok);

  return (
    <section aria-labelledby="results-heading" className="mt-8">
      <h2 id="results-heading" className="sr-only">
        Найденные работы
      </h2>
      <p className="text-sm text-ink-muted" role="status">
        {result.total > 0 ? `Найдено: ${formatCount(result.total)}` : "Ничего не найдено"}
        {result.sources.length > 1 &&
          result.total > 0 &&
          ` · ${result.sources
            .filter((status) => status.ok)
            .map(
              (status) =>
                `${SOURCE_LABELS[status.source]}: ${status.total.toLocaleString("ru-RU")}`,
            )
            .join(", ")}`}
      </p>

      {failed.length > 0 && (
        <p className="mt-3 rounded-sm bg-ochre-soft px-4 py-3 text-sm text-ink">
          {failed.map((status) => SOURCE_LABELS[status.source]).join(" и ")} временно не отвечает —
          показаны результаты доступного источника.
        </p>
      )}

      {result.items.length === 0 ? (
        <div className="mt-12 flex max-w-prose flex-col items-start gap-4">
          <SearchX aria-hidden className="size-8 text-ink-subtle" />
          <p className="font-display text-2xl font-semibold">Точного совпадения не найдено.</p>
          <p className="text-ink-muted">
            Попробуйте изменить язык, убрать кавычки или ввести имя автора. Названия в музейных
            каталогах обычно указаны на английском — например,{" "}
            <Link className={linkStyle} href="/search?q=Water%20Lilies">
              Water Lilies
            </Link>{" "}
            или{" "}
            <Link className={linkStyle} href="/search?q=Monet">
              Monet
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {result.items.map((item, index) => (
            <li
              key={`${item.source}:${item.id}`}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <ArtworkCard
                artwork={item}
                highlight={params.q}
                headingLevel="h3"
                priority={index < 4}
              />
            </li>
          ))}
        </ul>
      )}

      {(result.page > 1 || result.hasMore) && (
        <nav
          aria-label="Страницы результатов"
          className="mt-14 flex items-center justify-between gap-4 border-t border-line pt-6"
        >
          {result.page > 1 ? (
            <Link
              href={buildHref(params, result.page - 1)}
              className={buttonVariants.outline}
              rel="prev"
            >
              ← Предыдущая
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-muted">Страница {result.page}</span>
          {result.hasMore ? (
            <Link
              href={buildHref(params, result.page + 1)}
              className={buttonVariants.outline}
              rel="next"
            >
              Следующая →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
