import type { Metadata } from "next";
import type { ReactNode } from "react";
import { linkStyle, pageContainer } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "О проекте",
  description: "Цель Art Explorer, источники данных, лицензии, доступность и приватность.",
};

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={linkStyle} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (откроется в новой вкладке)</span>
    </a>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 border-t border-line pt-8 md:grid-cols-[14rem_1fr] md:gap-10"
    >
      <h2 id={id} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      <div className="max-w-prose space-y-4 text-ink-muted [&_strong]:font-medium [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className={`${pageContainer} py-10 sm:py-14`}>
      <p className="label">О проекте</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold text-balance">
        Музейные факты и понятный контекст — без выдумок
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-ink-muted">
        Art Explorer помогает найти картину по названию, рассмотреть её в хорошем качестве и
        разобраться в стиле, эпохе и технике — даже если вы никогда не изучали историю искусства.
      </p>

      <div className="mt-16 space-y-12">
        <Section id="goal" title="Цель">
          <p>
            Сделать открытые музейные коллекции понятными. Мы показываем сведения так, как их
            публикуют музеи, и добавляем справочный контекст только там, где его подтверждают
            музейные данные.
          </p>
        </Section>

        <Section id="sources" title="Источники">
          <p>
            <strong>Art Institute of Chicago.</strong> Поиск, карточки произведений, стили, описания
            и изображения через{" "}
            <ExternalLink href="https://api.artic.edu/docs/">публичный API</ExternalLink> и
            IIIF-сервер изображений. Метаданные — CC0, поле описания — CC BY 4.0 (
            <ExternalLink href="https://www.artic.edu/terms">условия использования</ExternalLink>).
          </p>
          <p>
            <strong>Cleveland Museum of Art.</strong> Поиск и подробные записи через{" "}
            <ExternalLink href="https://openaccess-api.clevelandart.org/">
              Open Access API
            </ExternalLink>
            . Данные открытого доступа публикуются под CC0; статус каждого изображения указан в
            записи музея.
          </p>
          <p>
            <strong>Wikipedia.</strong> Краткие справки о стилях, периодах, жанрах, техниках и
            авторах через{" "}
            <ExternalLink href="https://www.mediawiki.org/wiki/API:REST_API">
              Wikipedia REST API
            </ExternalLink>
            . Приоритет — русская Wikipedia, при отсутствии статьи — английская.
          </p>
        </Section>

        <Section id="trust" title="Достоверность">
          <p>
            <strong>Музеи — главный источник фактов о произведении:</strong> автор, дата, техника,
            размеры, стиль, права. Wikipedia используется только как справочный источник для
            объяснения контекста и никогда не заменяет музейную атрибуцию.
          </p>
          <p>
            Стиль картины не определяется по изображению и не «угадывается». Если музей не указал
            стиль или период, мы честно сообщаем об этом и показываем контекст об авторе, технике
            или культуре с пометкой, на каких музейных полях он основан.
          </p>
          <p>
            Музейные записи могут обновляться: уточняются атрибуции, даты, описания. Доступность
            изображений, тексты и лицензии определяют сами музеи — мы показываем только то, что
            указано в их открытых данных.
          </p>
        </Section>

        <Section id="license" title="Wikipedia и CC BY-SA">
          <p>
            Тексты Wikipedia доступны по лицензии{" "}
            <ExternalLink href="https://creativecommons.org/licenses/by-sa/4.0/deed.ru">
              Creative Commons Attribution-ShareAlike 4.0
            </ExternalLink>
            . Рядом с каждой справкой указаны название статьи, язык и ссылка на неё. Подробнее —{" "}
            <ExternalLink href="https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/ru">
              условия использования Wikimedia
            </ExternalLink>
            .
          </p>
          <p>
            Мы показываем только краткое резюме статьи и не копируем её полностью. Машинный перевод
            не применяется.
          </p>
        </Section>

        <Section id="a11y" title="Доступность">
          <p>
            Интерфейс поддерживает управление с клавиатуры, экранные дикторы (ARIA-разметка поиска и
            диалогов), светлую и тёмную темы, достаточную контрастность и настройку «уменьшить
            движение» в системе.
          </p>
        </Section>

        <Section id="privacy" title="Приватность">
          <p>
            Регистрация не нужна. <strong>Избранное хранится локально в вашем браузере</strong>{" "}
            (localStorage) и никуда не отправляется. Запросы к музеям и Wikipedia выполняет наш
            сервер — ваш браузер не обращается к Wikipedia напрямую. Изображения загружаются с
            серверов музеев.
          </p>
        </Section>
      </div>
    </div>
  );
}
