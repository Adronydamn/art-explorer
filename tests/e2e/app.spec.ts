import { expect, type Page, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("search and autocomplete", () => {
  test("user searches, sees suggestions and opens an artwork", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Найдите картину");

    const combobox = page.getByRole("combobox", { name: "Поиск картины по названию" });
    await combobox.fill("water lil");

    const listbox = page.getByRole("listbox", { name: "Подсказки поиска" });
    await expect(listbox).toBeVisible();
    const options = listbox.getByRole("option");
    await expect(options.first()).toContainText("Water Lilies");
    await expect(listbox).toContainText("Cleveland Museum of Art");
    await expect(listbox).toContainText("Art Institute of Chicago");
    await expect(options.last()).toContainText("Показать все результаты по запросу «water lil»");

    await options.first().click();
    await expect(page).toHaveURL(/\/artwork\/aic\/16568$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Water Lilies");
  });

  test("autocomplete works with the keyboard", async ({ page }) => {
    await page.goto("/");
    const combobox = page.getByRole("combobox", { name: "Поиск картины по названию" });
    await combobox.focus();
    await page.keyboard.type("monet");
    await expect(
      page.getByRole("option").filter({ hasText: "Claude Monet" }).first(),
    ).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await expect(combobox).toHaveAttribute("aria-activedescendant", /option-0$/);
    await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Escape");
    await expect(combobox).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/artwork\/(aic|cma)\/\d+$/);
  });

  test("Enter opens the results page with filters", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Поиск картины по названию" }).fill("water lilies");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=water(%20|\+)lilies/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("water lilies");
    await expect(page.getByText(/Найдено: \d+/)).toBeVisible();

    await page
      .locator("label")
      .filter({ has: page.getByRole("radio", { name: "Cleveland Museum of Art" }) })
      .click();
    await expect(page).toHaveURL(/source=cma/);
    await expect(page.getByRole("article").first()).toContainText("Cleveland Museum of Art");
    await expect(
      page.getByRole("article").filter({ hasText: "Art Institute of Chicago" }),
    ).toHaveCount(0);
  });

  test("shows results of one museum when the other is down", async ({ page }) => {
    await page.goto("/search?q=outage%20water");
    await expect(page.getByText(/временно не отвечает/)).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("shows a helpful empty state", async ({ page }) => {
    await page.goto("/search?q=zzzzqq");
    await expect(page.getByText("Точного совпадения не найдено.")).toBeVisible();
  });
});

test.describe("artwork page", () => {
  test("shows museum data, image and Wikipedia context with a link", async ({ page }) => {
    await page.goto("/artwork/aic/16568");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Water Lilies");
    await expect(page.getByRole("navigation", { name: "Навигационная цепочка" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Музейные сведения" })).toBeVisible();
    await expect(page.locator("dl").first()).toContainText("Oil on canvas");
    await expect(page.getByRole("button", { name: /Открыть изображение/ })).toBeVisible();

    const context = page.getByRole("region", { name: "Стиль и контекст" });
    await expect(context).toContainText("Impressionism");
    await expect(context).toContainText("Музейная классификация");
    const wikiLink = context.getByRole("link", { name: /Подробнее в Wikipedia/ });
    await expect(wikiLink).toHaveAttribute("href", /^https:\/\/ru\.wikipedia\.org\/wiki\//);
    await expect(context).toContainText("На основании музейных данных");
    await expect(page.getByText(/не заменяет музейную классификацию/)).toBeVisible();
  });

  test("still works when Wikipedia is unavailable", async ({ page }) => {
    await page.goto("/artwork/aic/111628");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nighthawks");
    await expect(page.getByRole("heading", { name: "Музейные сведения" })).toBeVisible();
    const context = page.getByRole("region", { name: "Стиль и контекст" });
    await expect(context).toContainText("Modernism");
    await expect(context).toContainText("Энциклопедическая справка временно недоступна");
  });

  test("marks English-only references and author context", async ({ page }) => {
    await page.goto("/artwork/cma/136510");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Water Lilies (Agapanthus)");
    const context = page.getByRole("region", { name: "Контекст об авторе" });
    await expect(context).toContainText("Справка доступна на английском языке.");
    await expect(context.getByRole("link", { name: /Подробнее в Wikipedia/ })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Claude_Monet",
    );
  });

  test("image viewer opens and closes with Escape, returning focus", async ({ page }) => {
    await page.goto("/artwork/aic/16568");
    const trigger = page.getByRole("button", { name: /Открыть изображение/ });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Water Lilies" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Закрыть просмотр" })).toBeFocused();
    await dialog.getByRole("button", { name: "Увеличить" }).click();
    await expect(
      dialog.getByRole("status", { name: "Масштаб" }).or(dialog.locator("output")),
    ).toHaveText("150%");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("returns 'not found' page for unknown artworks", async ({ page }) => {
    await page.goto("/artwork/aic/424242");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("не найдены");
  });
});

test.describe("favorites", () => {
  test("adds an artwork, persists after reload and can be cleared", async ({ page }) => {
    await page.goto("/artwork/aic/16568");
    const button = page.getByRole("button", { name: "В избранное" });
    await button.click();
    await expect(page.getByRole("button", { name: "В избранном" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.reload();
    await expect(page.getByRole("button", { name: "В избранном" })).toBeVisible();

    await page.goto("/favorites");
    await expect(page.getByRole("heading", { name: "Water Lilies" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Water Lilies" })).toBeVisible();

    await page.getByRole("button", { name: "Очистить избранное" }).click();
    const dialog = page.getByRole("dialog", { name: "Очистить избранное?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Очистить" }).click();
    await expect(
      page.getByText("Здесь появятся картины, которые вы захотите изучить позже."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Найти картину" })).toHaveAttribute("href", "/");
  });
});

test.describe("responsive layout @mobile", () => {
  for (const path of [
    "/",
    "/search?q=water%20lilies",
    "/artwork/aic/16568",
    "/artwork/cma/136510",
    "/favorites",
    "/about",
  ]) {
    test(`no horizontal overflow at 320px: ${path} @mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("load");
      await expectNoHorizontalOverflow(page);
    });
  }

  test("suggestions dropdown fits the viewport on mobile @mobile", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    await page.getByRole("combobox", { name: "Поиск картины по названию" }).fill("water");
    const listbox = page.getByRole("listbox", { name: "Подсказки поиска" });
    await expect(listbox).toBeVisible();
    const box = await listbox.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("content hygiene", () => {
  test("has no Artsy mentions and exactly one h1 per page", async ({ page }) => {
    for (const path of ["/", "/search?q=water", "/artwork/aic/16568", "/favorites", "/about"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const text = await page.locator("body").innerText();
      expect(text.toLowerCase()).not.toContain("artsy");
    }
  });
});
