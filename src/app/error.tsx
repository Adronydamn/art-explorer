"use client";

import { buttonVariants, pageContainer } from "@/components/ui/styles";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={`${pageContainer} py-20`}>
      <div role="alert" className="max-w-prose">
        <h1 className="font-display text-4xl font-semibold">Что-то пошло не так</h1>
        <p className="mt-3 text-ink-muted">Страницу не удалось загрузить. Попробуйте ещё раз.</p>
        <button type="button" onClick={reset} className={`${buttonVariants.primary} mt-6`}>
          Повторить
        </button>
      </div>
    </div>
  );
}
