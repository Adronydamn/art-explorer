"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: "/", label: "Главная" },
  { href: "/favorites", label: "Избранное" },
  { href: "/about", label: "О проекте" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Основная навигация">
      <ul className="flex items-center gap-0.5 sm:gap-1">
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center px-2 text-sm transition-colors sm:px-3",
                  active ? "text-ink" : "text-ink-muted hover:text-ink",
                  active &&
                    "after:absolute after:inset-x-2 after:bottom-2 after:h-px after:bg-ochre sm:after:inset-x-3",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
