"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils/cn";

const SOURCES = [
  { value: "all", label: "Все источники" },
  { value: "aic", label: "Art Institute of Chicago" },
  { value: "cma", label: "Cleveland Museum of Art" },
] as const;

type SearchFiltersProps = {
  source: "all" | "aic" | "cma";
  hasImage: boolean;
  publicDomain: boolean;
};

export function SearchFilters({ source, hasImage, publicDomain }: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div
      className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      aria-busy={pending}
    >
      <fieldset className="min-w-0">
        <legend className="sr-only">Источник</legend>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((option) => {
            const checked = source === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center rounded-sm border px-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                  checked
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong text-ink-muted hover:border-ink hover:text-ink",
                )}
              >
                <input
                  type="radio"
                  name="source"
                  value={option.value}
                  checked={checked}
                  onChange={() => update({ source: option.value === "all" ? null : option.value })}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
        <legend className="sr-only">Дополнительные фильтры</legend>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={hasImage}
            onChange={(event) => update({ hasImage: event.target.checked ? "true" : null })}
            className="size-4 accent-(--color-accent)"
          />
          Только с изображением
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={publicDomain}
            onChange={(event) => update({ publicDomain: event.target.checked ? "true" : null })}
            className="size-4 accent-(--color-accent)"
          />
          Общественное достояние / CC0
        </label>
        {pending && (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-subtle" role="status">
            <Loader2 aria-hidden className="size-3.5 animate-spin" /> Обновляем…
          </span>
        )}
      </fieldset>
    </div>
  );
}
