import Link from "next/link";
import { linkStyle, pageContainer } from "@/components/ui/styles";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-raised">
      <div
        className={`${pageContainer} grid gap-8 py-12 text-sm text-ink-muted md:grid-cols-[1.4fr_1fr_1fr]`}
      >
        <div className="space-y-3">
          <p className="font-display text-xl text-ink">Art Explorer</p>
          <p className="max-w-md">
            Сведения о произведениях предоставлены открытыми данными музеев. Энциклопедический
            контекст — Wikipedia, лицензия{" "}
            <a
              className={linkStyle}
              href="https://creativecommons.org/licenses/by-sa/4.0/deed.ru"
              rel="noopener noreferrer"
              target="_blank"
            >
              CC BY-SA 4.0
            </a>
            .
          </p>
        </div>
        <div>
          <p className="label mb-3">Источники</p>
          <ul className="space-y-2">
            <li>
              <a
                className={linkStyle}
                href="https://www.artic.edu/open-access/public-api"
                rel="noopener noreferrer"
                target="_blank"
              >
                Art Institute of Chicago
              </a>
            </li>
            <li>
              <a
                className={linkStyle}
                href="https://openaccess-api.clevelandart.org/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Cleveland Museum of Art
              </a>
            </li>
            <li>
              <a
                className={linkStyle}
                href="https://www.wikipedia.org/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Wikipedia
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="label mb-3">Проект</p>
          <ul className="space-y-2">
            <li>
              <Link className={linkStyle} href="/about">
                О проекте и лицензиях
              </Link>
            </li>
            <li>
              <Link className={linkStyle} href="/favorites">
                Избранное
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
