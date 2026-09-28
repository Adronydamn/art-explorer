"use client";

import { ArrowRight, ImageOff } from "lucide-react";
import { motion } from "motion/react";
import type { SuggestionsState } from "@/hooks/use-suggestions";
import type { ArtworkSummary } from "@/lib/artwork/types";
import { SOURCE_LABELS, SOURCE_SHORT_LABELS } from "@/lib/artwork/types";
import { cn } from "@/lib/utils/cn";
import { ArtImage } from "@/components/ui/art-image";
import { Highlight } from "./highlight";

type SearchSuggestionsProps = {
  listboxId: string;
  state: SuggestionsState;
  items: ArtworkSummary[];
  query: string;
  activeIndex: number;
  optionId: (index: number) => string;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
};

function StatusMessage({ state }: { state: SuggestionsState }) {
  if (state.status === "too-short") return <>Введите минимум 2 символа</>;
  if (state.status === "error")
    return state.kind === "unavailable" ? (
      <>Музейные источники временно недоступны. Попробуйте ещё раз чуть позже.</>
    ) : (
      <>Не удалось загрузить подсказки. Проверьте подключение к сети.</>
    );
  if (state.status === "success" && state.items.length === 0)
    return (
      <>
        Точного совпадения не найдено. Попробуйте изменить язык, убрать кавычки или ввести имя
        автора.
      </>
    );
  return null;
}

function SuggestionSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5" aria-hidden>
      <div className="skeleton h-14 w-11 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SearchSuggestions({
  listboxId,
  state,
  items,
  query,
  activeIndex,
  optionId,
  onSelect,
  onHover,
}: SearchSuggestionsProps) {
  const loading = state.status === "loading";
  const partial = state.status === "success" && state.unavailableSources.length > 0;
  const showAllIndex = items.length;
  const canShowAll = state.status !== "too-short" && state.status !== "idle";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      className="absolute inset-x-0 top-full z-(--z-dropdown) mt-2 overflow-hidden rounded-md border border-line bg-paper-raised shadow-float"
    >
      <div className="max-h-[min(65vh,34rem)] overflow-y-auto overscroll-contain">
        {loading && items.length === 0 ? (
          <div role="presentation">
            <SuggestionSkeleton />
            <SuggestionSkeleton />
            <SuggestionSkeleton />
          </div>
        ) : null}

        {(state.status === "too-short" ||
          state.status === "error" ||
          (state.status === "success" && items.length === 0)) && (
          <p className="px-4 py-4 text-sm text-ink-muted">
            <StatusMessage state={state} />
          </p>
        )}

        <ul
          id={listboxId}
          role="listbox"
          aria-label="Подсказки поиска"
          className={cn(loading && items.length > 0 && "opacity-70")}
        >
          {items.map((item, index) => (
            <li
              key={`${item.source}:${item.id}`}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(index)}
              onMouseMove={() => onHover(index)}
              className={cn(
                "flex min-h-16 cursor-pointer items-center gap-3 border-b border-line/60 px-3 py-2",
                index === activeIndex ? "bg-paper-sunk" : "bg-transparent",
              )}
            >
              <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-xs bg-paper-sunk">
                {item.image ? (
                  <ArtImage image={{ ...item.image, alt: "" }} sizes="48px" fit="cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-ink-subtle">
                    <ImageOff aria-hidden className="size-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg leading-tight font-semibold">
                  <Highlight text={item.title} query={query} />
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {[item.artistName, item.dateDisplay].filter(Boolean).join(" · ") ||
                    "Автор не указан"}
                </p>
                <p className="truncate text-2xs text-ink-subtle">
                  <span aria-hidden>{SOURCE_SHORT_LABELS[item.source]} · </span>
                  {SOURCE_LABELS[item.source]}
                </p>
              </div>
            </li>
          ))}
          {canShowAll && (
            <li
              id={optionId(showAllIndex)}
              role="option"
              aria-selected={activeIndex === showAllIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(showAllIndex)}
              onMouseMove={() => onHover(showAllIndex)}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-accent",
                activeIndex === showAllIndex && "bg-paper-sunk",
              )}
            >
              <span className="min-w-0 truncate">Показать все результаты по запросу «{query}»</span>
              <ArrowRight aria-hidden className="size-4 shrink-0" />
            </li>
          )}
        </ul>

        {partial && (
          <p className="border-t border-line px-4 py-2 text-xs text-ink-subtle">
            Один из музейных источников временно недоступен — показаны результаты другого.
          </p>
        )}
      </div>
    </motion.div>
  );
}
