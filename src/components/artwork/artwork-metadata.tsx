import type { ReactNode } from "react";
import { linkStyle } from "@/components/ui/styles";
import type { Artwork } from "@/lib/artwork/types";

type Row = { term: string; value: ReactNode };

function rows(artwork: Artwork): Row[] {
  const list: Array<[string, ReactNode | undefined]> = [
    [
      "Автор",
      artwork.artistDisplay ? (
        <span className="whitespace-pre-line">{artwork.artistDisplay}</span>
      ) : (
        artwork.artistName
      ),
    ],
    ["Дата создания", artwork.dateDisplay],
    ["Страна / культура", artwork.culture],
    ["Место создания", artwork.placeOfOrigin],
    ["Материалы и техника", artwork.medium],
    ["Размеры", artwork.dimensions],
    ["Стиль", artwork.style],
    ["Период", artwork.period],
    ["Тип произведения", artwork.artworkType],
    ["Классификация", artwork.classification],
    ["Отдел", artwork.department],
    ["Коллекция", artwork.collection],
    ["Место в музее", artwork.gallery],
    ["Инвентарный номер", artwork.accessionNumber],
    [
      "Надписи",
      artwork.inscriptions.length > 0 ? (
        <ul className="space-y-1">
          {artwork.inscriptions.map((inscription) => (
            <li key={inscription}>{inscription}</li>
          ))}
        </ul>
      ) : undefined,
    ],
    ["Credit line", artwork.creditLine],
    ["Статус прав", artwork.rightsStatement],
    [
      "Страница в музее",
      <a
        key="link"
        className={`${linkStyle} break-words`}
        href={artwork.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {artwork.sourceLabel}
        <span className="sr-only"> (откроется в новой вкладке)</span>
      </a>,
    ],
  ];
  return list
    .filter((entry): entry is [string, ReactNode] => entry[1] !== undefined && entry[1] !== "")
    .map(([term, value]) => ({ term, value }));
}

/** Museum wall-label style facts. Only fields present in the museum record are rendered. */
export function ArtworkMetadata({ artwork }: { artwork: Artwork }) {
  return (
    <section aria-labelledby="metadata-heading" className="border-t border-ink pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="metadata-heading" className="font-display text-3xl font-semibold">
          Музейные сведения
        </h2>
        <p className="text-xs text-ink-subtle">Источник: {artwork.sourceLabel}</p>
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-[minmax(9rem,12rem)_1fr]">
        {rows(artwork).map((row) => (
          <div
            key={row.term}
            className="grid grid-cols-subgrid border-b border-line py-3 sm:col-span-2"
          >
            <dt className="label pt-0.5">{row.term}</dt>
            <dd className="mt-1 text-sm break-words text-ink sm:mt-0">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
