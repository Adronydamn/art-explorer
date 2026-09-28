"use client";

import Link from "next/link";
import { buttonVariants, pageContainer } from "@/components/ui/styles";

export default function ArtworkError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={`${pageContainer} py-20`}>
      <div role="alert" className="max-w-prose border-l-2 border-accent pl-5">
        <h1 className="font-display text-4xl font-semibold">Музей временно не отвечает</h1>
        <p className="mt-3 text-ink-muted">
          Не удалось загрузить сведения о произведении из музейного каталога. Обычно это временная
          проблема — попробуйте повторить через минуту. Сохранённые работы по-прежнему доступны в
          избранном.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className={buttonVariants.primary}>
            Повторить
          </button>
          <Link href="/favorites" className={buttonVariants.outline}>
            Открыть избранное
          </Link>
        </div>
      </div>
    </div>
  );
}
