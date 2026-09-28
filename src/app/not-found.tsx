import Link from "next/link";
import { SearchInput } from "@/components/search/search-input";
import { buttonVariants, pageContainer } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <div className={`${pageContainer} py-20`}>
      <p className="label">Ошибка 404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">
        Страница или произведение не найдены
      </h1>
      <p className="mt-4 max-w-prose text-ink-muted">
        Возможно, ссылка устарела или запись удалена из открытого каталога музея. Попробуйте найти
        работу заново.
      </p>
      <div className="mt-8 max-w-2xl">
        <SearchInput />
      </div>
      <Link href="/" className={`${buttonVariants.outline} mt-8`}>
        На главную
      </Link>
    </div>
  );
}
