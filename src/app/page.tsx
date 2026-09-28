import Link from "next/link";
import { Suspense } from "react";
import { ArtworkCard, ArtworkCardSkeleton } from "@/components/artwork/artwork-card";
import { SearchInput } from "@/components/search/search-input";
import { linkStyle, pageContainer } from "@/components/ui/styles";
import { getFeaturedArtworks } from "@/lib/services/artworks";

// Rendered per request: featured records come from the 6-hour in-memory artwork cache, and a museum
// outage at build time must not be frozen into a statically generated page.
export const dynamic = "force-dynamic";

const QUICK_QUERIES = ["Water Lilies", "Monet", "Nighthawks", "The Bedroom", "Rembrandt"];

const STEPS = [
  {
    title: "Найдите картину",
    text: "Начните вводить название — подсказки появятся сразу из двух музейных каталогов.",
  },
  {
    title: "Откройте музейные сведения",
    text: "Дата, техника, размеры, права и описание — ровно так, как их публикует музей.",
  },
  {
    title: "Изучите стиль и контекст",
    text: "Справка Wikipedia о направлении, периоде или авторе — только если музей это подтверждает.",
  },
];

const SOURCES = [
  {
    name: "Art Institute of Chicago",
    role: "Музейный каталог",
    text: "Более 100 000 записей: описания кураторов, стили, изображения в формате IIIF.",
  },
  {
    name: "Cleveland Museum of Art",
    role: "Музейный каталог",
    text: "Открытые данные коллекции: провенанс, выставки, изображения CC0.",
  },
  {
    name: "Wikipedia",
    role: "Справочный контекст",
    text: "Краткие справки о стилях и эпохах. Не заменяет музейную атрибуцию.",
  },
];

async function FeaturedArtworks() {
  const featured = await getFeaturedArtworks();
  if (featured.length === 0) {
    return (
      <p className="mt-8 max-w-prose text-ink-muted">
        Подборка временно недоступна — музейные каталоги не ответили. Воспользуйтесь поиском выше.
      </p>
    );
  }
  return (
    <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 xs:grid-cols-2 lg:grid-cols-3">
      {featured.map((artwork, index) => (
        <li key={`${artwork.source}:${artwork.id}`}>
          <ArtworkCard artwork={artwork} priority={index < 2} />
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="relative border-b border-line">
        <div className={`${pageContainer} pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-28`}>
          <p className="label flex items-center gap-3">
            <span aria-hidden className="h-px w-10 bg-ochre" />
            Открытые коллекции двух музеев
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-semibold text-balance">
            Найдите картину. Узнайте её историю. Научитесь видеть{" "}
            <em className="text-accent">стиль</em>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-muted">
            Art Explorer объединяет каталоги Art Institute of Chicago и Cleveland Museum of Art и
            объясняет контекст произведения простым языком — без выдуманных фактов.
          </p>
          <div className="mt-10 max-w-3xl">
            <SearchInput size="hero" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-ink-muted">
            <span className="mr-2">Попробуйте:</span>
            {QUICK_QUERIES.map((query) => (
              <Link
                key={query}
                href={`/search?q=${encodeURIComponent(query)}`}
                className="inline-flex min-h-11 items-center rounded-sm px-2.5 text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
              >
                {query}
              </Link>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-xs text-ink-subtle">
            Названия в музейных каталогах указаны на языке оригинальной записи — чаще всего на
            английском.
          </p>
        </div>
      </section>

      <section aria-labelledby="how-heading" className={`${pageContainer} py-20`}>
        <h2 id="how-heading" className="font-display text-3xl font-semibold">
          Как это работает
        </h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t border-ink pt-5">
              <span aria-hidden className="font-display text-5xl text-ochre">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-lg font-semibold">
                <span className="sr-only">Шаг {index + 1}. </span>
                {step.title}
              </h3>
              <p className="mt-2 text-ink-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="featured-heading" className="bg-paper-raised py-20">
        <div className={pageContainer}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label">Подборка из музейных каталогов</p>
              <h2 id="featured-heading" className="mt-2 font-display text-3xl font-semibold">
                Популярно для изучения
              </h2>
            </div>
            <p className="max-w-sm text-sm text-ink-muted">
              Названия, даты и изображения загружаются напрямую из открытых данных музеев.
            </p>
          </div>
          <Suspense
            fallback={
              <div
                className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 xs:grid-cols-2 lg:grid-cols-3"
                role="status"
                aria-label="Загружаем подборку"
              >
                {Array.from({ length: 3 }, (_, index) => (
                  <ArtworkCardSkeleton key={index} />
                ))}
              </div>
            }
          >
            <FeaturedArtworks />
          </Suspense>
        </div>
      </section>

      <section aria-labelledby="sources-heading" className={`${pageContainer} py-20`}>
        <h2 id="sources-heading" className="font-display text-3xl font-semibold">
          Откуда берутся сведения
        </h2>
        <ul className="mt-10 grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
          {SOURCES.map((source) => (
            <li key={source.name} className="bg-paper p-6">
              <p className="label">{source.role}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold">{source.name}</h3>
              <p className="mt-2 text-sm text-ink-muted">{source.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-muted">
          Подробнее об источниках, лицензиях и приватности —{" "}
          <Link href="/about" className={linkStyle}>
            на странице «О проекте»
          </Link>
          .
        </p>
      </section>
    </>
  );
}
