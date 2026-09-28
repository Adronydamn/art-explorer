import Link from "next/link";
import { pageContainer } from "@/components/ui/styles";
import { SiteNav } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="z-(--z-header) border-b border-line bg-paper sm:sticky sm:top-0 sm:bg-paper/90 sm:backdrop-blur-sm">
      <div
        className={`${pageContainer} flex flex-wrap items-center justify-between gap-x-2 py-2 sm:h-16 sm:flex-nowrap sm:py-0`}
      >
        <Link
          href="/"
          className="group flex min-h-11 shrink-0 items-center gap-2.5"
          aria-label="Art Explorer — на главную"
        >
          <span
            aria-hidden
            className="block size-3 bg-ochre transition-transform duration-300 group-hover:rotate-45"
          />
          <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Art Explorer
          </span>
        </Link>
        <div className="order-last -mx-2 w-full sm:order-none sm:mx-0 sm:ml-auto sm:w-auto">
          <SiteNav />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
