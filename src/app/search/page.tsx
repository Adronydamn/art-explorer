import type { Metadata } from "next";
import { Suspense } from "react";
import { ArtworkCardSkeleton } from "@/components/artwork/artwork-card";
import { LastSearchRecorder } from "@/components/artwork/back-to-results";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchInput } from "@/components/search/search-input";
import { SearchResults } from "@/components/search/search-results";
import { pageContainer } from "@/components/ui/styles";
import { pageParamsToObject, searchParamsSchema } from "@/lib/validation/schemas";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const parsed = searchParamsSchema.safeParse(pageParamsToObject(await searchParams));
  return {
    title: parsed.success ? `Поиск: ${parsed.data.q}` : "Поиск картин",
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const raw = pageParamsToObject(await searchParams);
  const parsed = searchParamsSchema.safeParse(raw);
  const rawQuery = raw.q?.trim() ?? "";

  return (
    <div className={`${pageContainer} py-10 sm:py-14`}>
      <LastSearchRecorder />
      <p className="label mb-3">Поиск по коллекциям</p>
      <h1 className="font-display text-4xl font-semibold text-balance">
        {parsed.success ? (
          <>
            Результаты по запросу <span className="text-accent italic">«{parsed.data.q}»</span>
          </>
        ) : (
          "Поиск картин"
        )}
      </h1>

      <div className="mt-8 max-w-3xl">
        <SearchInput key={rawQuery} defaultValue={rawQuery} />
      </div>

      {parsed.success ? (
        <>
          <div className="mt-8 border-y border-line py-4">
            <SearchFilters
              source={parsed.data.source}
              hasImage={parsed.data.hasImage}
              publicDomain={parsed.data.publicDomain}
            />
          </div>
          <Suspense key={JSON.stringify(parsed.data)} fallback={<ResultsSkeleton />}>
            <SearchResults params={parsed.data} />
          </Suspense>
        </>
      ) : (
        <p className="mt-10 max-w-prose text-ink-muted" role={rawQuery ? "alert" : undefined}>
          {rawQuery
            ? (parsed.error.issues[0]?.message ?? "Некорректный запрос")
            : "Введите название картины или имя художника — например, «Water Lilies» или «Monet»."}
        </p>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div role="status" aria-label="Загружаем результаты" className="mt-8">
      <div className="skeleton mb-8 h-4 w-48" />
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <ArtworkCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
