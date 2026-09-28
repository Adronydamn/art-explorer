import { pageContainer } from "@/components/ui/styles";

export default function ArtworkLoading() {
  return (
    <div
      className={`${pageContainer} pt-6 pb-10`}
      role="status"
      aria-label="Загружаем сведения о произведении"
    >
      <div className="skeleton h-4 w-64" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-14">
        <div className="space-y-4 lg:col-start-2 lg:row-start-1">
          <div className="skeleton h-3 w-40" />
          <div className="skeleton h-12 w-4/5" />
          <div className="skeleton h-6 w-1/2" />
          <div className="flex gap-2 pt-4">
            <div className="skeleton h-11 w-36" />
            <div className="skeleton h-11 w-36" />
          </div>
        </div>
        <div className="mat lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div className="skeleton aspect-[4/5]" />
        </div>
        <div className="space-y-3 lg:col-start-2 lg:row-start-2">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="skeleton h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
