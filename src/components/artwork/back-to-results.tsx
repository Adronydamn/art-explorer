"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const LAST_SEARCH_KEY = "art-explorer:last-search";

function readLastSearch(): string | null {
  try {
    const value = window.sessionStorage.getItem(LAST_SEARCH_KEY);
    return value?.startsWith("/search?") ? value : null;
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => undefined;

/** Remembers the current search URL so the artwork page can link back to the same results. */
export function LastSearchRecorder() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    const query = searchParams.toString();
    if (!query) return;
    try {
      window.sessionStorage.setItem(LAST_SEARCH_KEY, `${pathname}?${query}`);
    } catch {
      // sessionStorage unavailable: the back link falls back to the search page.
    }
  }, [pathname, searchParams]);
  return null;
}

function useLastSearch(): string | null {
  return useSyncExternalStore(noopSubscribe, readLastSearch, () => null);
}

export function ArtworkBreadcrumbs({ title }: { title: string }) {
  const lastSearch = useLastSearch();
  return (
    <nav
      aria-label="Навигационная цепочка"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-ink-muted">
        <li>
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-ink">
            Главная
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="size-3.5" />
        </li>
        <li>
          <Link
            href={lastSearch ?? "/search"}
            className="inline-flex min-h-11 items-center hover:text-ink"
          >
            Поиск
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="size-3.5" />
        </li>
        <li className="max-w-[16rem] min-w-0 truncate text-ink sm:max-w-md" aria-current="page">
          {title}
        </li>
      </ol>
      {lastSearch && (
        <Link
          href={lastSearch}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-accent hover:text-accent-strong"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Назад к результатам
        </Link>
      )}
    </nav>
  );
}
