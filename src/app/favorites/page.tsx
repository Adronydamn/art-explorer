import type { Metadata } from "next";
import { FavoritesList } from "@/components/favorites/favorites-list";
import { pageContainer } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Картины, сохранённые для изучения. Хранятся локально в вашем браузере.",
  robots: { index: false },
};

export default function FavoritesPage() {
  return (
    <div className={`${pageContainer} py-10 sm:py-14`}>
      <p className="label">Хранится только в этом браузере</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Избранное</h1>
      <FavoritesList />
    </div>
  );
}
