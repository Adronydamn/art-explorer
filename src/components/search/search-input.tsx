"use client";

import { Loader2, Search, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useSuggestions } from "@/hooks/use-suggestions";
import { normalizeSuggestionQuery } from "@/lib/search/suggestions-client";
import { MAX_QUERY_LENGTH } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils/cn";
import { SearchSuggestions } from "./search-suggestions";

export const SEARCH_PLACEHOLDER = "Например, “Звёздная ночь”, “The Kiss” или “Water Lilies”";

type SearchInputProps = {
  defaultValue?: string;
  size?: "hero" | "compact";
  autoFocus?: boolean;
  label?: string;
};

export function SearchInput({
  defaultValue = "",
  size = "compact",
  autoFocus = false,
  label = "Поиск картины по названию",
}: SearchInputProps) {
  const router = useRouter();
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const state = useSuggestions(value, open);
  const items = state.status === "success" || state.status === "loading" ? state.items : [];
  const query = normalizeSuggestionQuery(value);
  const hasShowAll =
    state.status === "loading" || state.status === "success" || state.status === "error";
  const optionCount = items.length + (hasShowAll ? 1 : 0);
  const expanded = open && state.status !== "idle";
  const optionId = (index: number) => `${baseId}-option-${index}`;

  function goToSearch() {
    if (query.length === 0) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function select(index: number) {
    const item = items[index];
    if (item) {
      setOpen(false);
      router.push(`/artwork/${item.source}/${encodeURIComponent(item.id)}`);
    } else {
      goToSearch();
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (expanded && activeIndex >= 0) select(activeIndex);
    else goToSearch();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) setOpen(true);
        if (optionCount > 0) setActiveIndex((index) => (index + 1) % optionCount);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (optionCount > 0) setActiveIndex((index) => (index <= 0 ? optionCount - 1 : index - 1));
        break;
      case "Escape":
        if (expanded) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        } else if (value) {
          event.preventDefault();
          setValue("");
        }
        break;
      case "Tab":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  const statusText =
    state.status === "loading"
      ? "Ищем подсказки…"
      : state.status === "success"
        ? state.items.length > 0
          ? `Найдено подсказок: ${state.items.length}. Используйте стрелки вверх и вниз для выбора.`
          : "Точного совпадения не найдено."
        : state.status === "error"
          ? "Подсказки временно недоступны."
          : state.status === "too-short"
            ? "Введите минимум 2 символа."
            : "";

  const hero = size === "hero";

  return (
    <form role="search" onSubmit={onSubmit} className="relative w-full" aria-label="Поиск картин">
      <label htmlFor={`${baseId}-input`} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-md border bg-paper-raised transition-colors",
          "border-line-strong focus-within:border-ink",
          hero ? "min-h-16 px-4 shadow-raise sm:min-h-[4.5rem] sm:px-5" : "min-h-12 px-3",
        )}
      >
        {state.status === "loading" ? (
          <Loader2
            aria-hidden
            className={cn("shrink-0 animate-spin text-ink-subtle", hero ? "size-5" : "size-4")}
          />
        ) : (
          <Search
            aria-hidden
            className={cn("shrink-0 text-ink-subtle", hero ? "size-5" : "size-4")}
          />
        )}
        <input
          ref={inputRef}
          id={`${baseId}-input`}
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            expanded && activeIndex >= 0 && activeIndex < optionCount
              ? optionId(activeIndex)
              : undefined
          }
          aria-describedby={`${baseId}-hint`}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={MAX_QUERY_LENGTH}
          autoFocus={autoFocus}
          placeholder={SEARCH_PLACEHOLDER}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle [&::-webkit-search-cancel-button]:hidden",
            hero ? "text-base sm:text-lg" : "text-base",
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-subtle hover:text-ink"
            aria-label="Очистить поле поиска"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
        <button
          type="submit"
          className={cn(
            "hidden shrink-0 items-center rounded-sm bg-ink font-medium text-paper transition-colors hover:bg-accent-strong xs:inline-flex dark:hover:bg-accent",
            hero ? "min-h-11 px-5 text-sm" : "min-h-9 px-3 text-sm",
          )}
        >
          Найти
        </button>
      </div>
      <p id={`${baseId}-hint`} className="sr-only">
        Подсказки появляются после ввода двух символов. Enter — показать все результаты.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {open ? statusText : ""}
      </p>
      <AnimatePresence>
        {expanded && (
          <SearchSuggestions
            listboxId={listboxId}
            state={state}
            items={items}
            query={query}
            activeIndex={activeIndex}
            optionId={optionId}
            onSelect={select}
            onHover={setActiveIndex}
          />
        )}
      </AnimatePresence>
    </form>
  );
}
