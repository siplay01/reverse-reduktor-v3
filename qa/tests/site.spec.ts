import { test, expect, type Page } from "@playwright/test";

const errors = (page: Page) => {
  const list: string[] = [];
  page.on("pageerror", (e) => list.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") list.push(m.text()); });
  return list;
};
const visibleCards = (page: Page) => page.locator("[data-card]:visible");

test("direct open of key routes: 200, h1, no JS errors, no broken images", async ({ page }) => {
  const errs = errors(page);
  for (const r of ["", "katalog/", "katalog/rr-300/", "katalog/3d6/", "katalog/detal/525-16-400/", "katalog/rr-300/uzly/", "katalog/rr-300/uzly/ris-05/",
    "oborudovanie/", "oborudovanie/rr-300/", "remont/", "dokumentaciya/", "dokumentaciya/katalog-rr-300/", "tendery/", "o-kompanii/", "kontakty/", "dostavka-i-oplata/", "zapros/"]) {
    const res = await page.goto(r);
    expect(res?.status(), r).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((s) => setTimeout(s, 30)); } });
    await page.waitForLoadState("networkidle");
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.src));
    expect(broken, r).toEqual([]);
  }
  expect(errs).toEqual([]);
});

test("client-facing pages carry no internal notes", async ({ page }) => {
  const banned = /сверен|распознан|OCR|в архиве|архивн|источник|Демонстрац|не подтвержд|в найденных/i;
  for (const r of ["", "katalog/", "katalog/detal/525-16-400/", "katalog/detal/1225m-48-1/", "katalog/rr-300/uzly/", "katalog/rr-300/uzly/ris-25/",
    "oborudovanie/rr-300/", "oborudovanie/3d6/", "remont/", "dokumentaciya/", "tendery/", "o-kompanii/", "kontakty/", "dostavka-i-oplata/", "zapros/"]) {
    await page.goto(r);
    const text = await page.locator("body").innerText();
    expect(text.match(banned)?.[0] ?? null, r).toBeNull();
  }
});

test("unknown URL shows the 404 page", async ({ page }) => {
  const res = await page.goto("net-takoy-stranicy/");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Страница не найдена");
});

test("search: exact designation ranks first, spacing/Latin variants, partial, empty state", async ({ page }) => {
  await page.goto("katalog/");
  const q = page.locator("#cq");
  for (const [query, first] of [["525-16-400", "525-16-400"], ["525 16 400", "525-16-400"], ["52516400", "525-16-400"], ["sb525-12-104", "СБ525-12-104"], ["cб525 12 104", "СБ525-12-104"]]) {
    await q.fill(query);
    await expect(visibleCards(page).first().locator(".sku")).toHaveText(first);
  }
  await q.fill("шестерня");
  await expect.poll(() => visibleCards(page).count()).toBeGreaterThan(5);
  await expect(page.locator("[data-count]")).toContainText("Найдено:");
  await q.fill("ШЕСТЕРНЯ ведущая");
  await expect(visibleCards(page).first().locator(".ttl")).toContainText(/естерня/i);
  await q.fill("525-16");
  await expect.poll(() => visibleCards(page).count()).toBeGreaterThan(3);
  await q.fill("zzzzqqq");
  await expect(page.locator("[data-empty]")).toBeVisible();
  await expect(visibleCards(page)).toHaveCount(0);
  await page.locator("[data-empty] [data-reset]").click();
  await expect(page.locator("[data-empty]")).toBeHidden();
});

test("home search lands in the catalog with the query applied", async ({ page }) => {
  await page.goto("");
  await page.locator("#hq").fill("525-16-400");
  await page.locator("#hq").press("Enter");
  await expect(page).toHaveURL(/katalog\/\?q=525-16-400/);
  await expect(visibleCards(page).first().locator(".sku")).toHaveText("525-16-400");
});

test("filters: model, type, node, photo; state in URL and restored on reload", async ({ page, isMobile }) => {
  await page.goto("katalog/");
  if (isMobile) await page.locator("[data-filters-toggle]").click();
  await page.locator('[data-f="model"][data-v="3d6"]').click();
  await expect(page).toHaveURL(/model=3d6/);
  const n = await visibleCards(page).count();
  expect(n).toBeGreaterThan(0);
  for (const m of await visibleCards(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.m))) expect(m).toContain("3d6");
  await page.locator('[data-f="model"][data-v=""]').click();
  await page.locator('[data-f="type"][value="Шестерни"]').check();
  for (const t of await visibleCards(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.t))) expect(t).toBe("Шестерни");
  await page.locator('[data-f="type"][value="Шестерни"]').uncheck();
  await page.locator('[data-f="uzel"]').selectOption("5");
  await expect(page).toHaveURL(/uzel=5/);
  for (const a of await visibleCards(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.a))) expect(a!.split(" ")).toContain("5");
  await page.locator('[data-f="photo"]').check();
  await page.reload();
  await expect(page.locator('[data-f="uzel"]')).toHaveValue("5");
  await expect(page.locator('[data-f="photo"]')).toBeChecked();
  for (const p of await visibleCards(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.p))) expect(p).toBe("1");
});

test("show more reveals the next page of cards", async ({ page }) => {
  await page.goto("katalog/");
  await expect(visibleCards(page)).toHaveCount(48);
  await page.locator("[data-more]").click();
  await expect(visibleCards(page)).toHaveCount(96);
});

test("category navigation: catalog -> model -> part -> node", async ({ page }) => {
  await page.goto("katalog/");
  await page.locator("main").getByRole("link", { name: "РР-300", exact: true }).first().click();
  await expect(page.locator("h1")).toContainText("Запчасти РР-300");
  await visibleCards(page).first().locator(".ttl").click();
  await expect(page.locator(".prod .code")).toBeVisible();
  await page.goto("katalog/detal/525-16-400/");
  await page.locator(".facts a", { hasText: "рис." }).first().click();
  await expect(page).toHaveURL(/uzly\/ris-0[56]\/#poz-/);
  await expect(page.locator("tr:target")).toContainText("525-16-400");
});

test("request list: add, quantity, remove, persist after reload, mail text, validation", async ({ page }) => {
  await page.goto("katalog/detal/525-16-400/");
  await page.locator("#qty").fill("3");
  await page.getByRole("button", { name: "Добавить в запрос" }).click();
  await expect(page.locator("[data-toast]")).toBeVisible();
  await expect(page.locator("[data-in-list]")).toContainText("3 шт.");
  await expect(page.locator(".header [data-rfq-count]")).toHaveText("1");
  await page.goto("katalog/");
  const card = visibleCards(page).filter({ has: page.locator(".sku", { hasText: /^20-09-71$/ }) });
  await card.locator("[data-rfq-add]").click();
  await expect(card.locator("[data-rfq-add]")).toHaveAttribute("aria-pressed", "true");
  await page.goto("katalog/rr-300/uzly/ris-05/");
  await page.locator("tr", { hasText: "525-547" }).locator("[data-rfq-add]").click();
  await expect(page.locator(".header [data-rfq-count]")).toHaveText("3");

  await page.goto("zapros/");
  const rows = page.locator("[data-rows] > li");
  await expect(rows).toHaveCount(3);
  await rows.first().locator('[data-step="1"]').click();
  await expect(rows.first().locator("input")).toHaveValue("4");
  await rows.nth(1).locator("input").fill("12");
  await rows.nth(1).locator("input").press("Tab");
  await rows.nth(2).locator("[data-del]").click();
  await expect(rows).toHaveCount(2);
  await page.reload();
  await expect(rows).toHaveCount(2);
  await expect(rows.first().locator("input")).toHaveValue("4");
  await expect(rows.nth(1).locator("input")).toHaveValue("12");

  // no contact -> error, mail link blocked
  await page.locator("[data-mail]").click();
  await expect(page.locator("[data-err]")).toBeVisible();
  await expect(page.locator("#f-tel")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#f-tel").fill("+7 900 123-45-67");
  await page.locator("#f-org").fill("Тест");
  const href = decodeURIComponent((await page.locator("[data-mail]").getAttribute("href"))!);
  expect(href).toContain("mailto:sibflot.servis@yandex.ru");
  expect(href).toContain("525-16-400 Полумуфта ведомая: 4 шт.");
  expect(href).toContain("20-09-71");
  expect(href).toContain(": 12 шт.");
  expect(href).toContain("Телефон: +7 900 123-45-67");
  await page.locator("summary", { hasText: "Текст письма" }).click();
  await expect(page.locator("[data-preview]")).toContainText("Организация: Тест");
  await page.locator("[data-clear]").click();
  await expect(page.locator("[data-empty-list]")).toBeVisible();
});

test("mobile navigation opens, links work, Escape closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("");
  const nav = page.locator("#nav");
  await expect(nav).toBeHidden();
  await page.locator("[data-menu]").click();
  await expect(nav).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await page.locator("[data-menu]").click();
  await nav.getByRole("link", { name: "Тендеры" }).click();
  await expect(page.locator("h1")).toHaveText("Тендеры и государственные закупки");
});

test("documents: PDF is served and linked, scans open in the viewer", async ({ page, request }) => {
  await page.goto("dokumentaciya/");
  const href = await page.getByRole("link", { name: "Открыть PDF" }).getAttribute("href");
  const res = await request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("pdf");
  expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await page.goto("dokumentaciya/katalog-rr-300/");
  await page.locator(".scan-grid a").first().click();
  await expect(page.locator("[data-lightbox]")).toBeVisible();
  await page.locator("[data-lightbox-close]").click();
  await expect(page.locator("[data-lightbox]")).toBeHidden();
});

test("no horizontal page scroll at 320-1920 px", async ({ page, browserName, isMobile }) => {
  test.skip(isMobile, "desktop profile resizes through all widths");
  const bad: string[] = [];
  for (const w of [320, 375, 390, 430, 768, 1024, 1366, 1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const r of ["", "katalog/", "katalog/detal/1225m-48-1/", "katalog/rr-300/uzly/ris-01/", "oborudovanie/rr-300/", "zapros/", "tendery/", "kontakty/", "dokumentaciya/"]) {
      await page.goto(r);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (over > 0) bad.push(`${w} ${r}: ${over}px`);
      // header controls must stay fully inside the viewport (overflow there is clipped, not scrolled)
      const clipped = await page.evaluate(() => [...document.querySelectorAll(".header a, .header button")].filter((e) => {
        const b = e.getBoundingClientRect(), el = e as HTMLElement;
        if (!b.width || e.closest(".nav:not(.open)") || el.classList.contains("brand")) return false;
        return b.right > innerWidth + 1 || b.left < -1 || b.width < 40 || el.scrollWidth > el.clientWidth + 1;
      }).map((e) => e.className || e.tagName));
      if (clipped.length) bad.push(`${w} ${r}: header clipped ${clipped.join(",")}`);
    }
  }
  expect(bad).toEqual([]);
});

test("keyboard: skip link and visible focus", async ({ page, browserName, isMobile }) => {
  test.skip(isMobile || browserName === "webkit", "WebKit does not Tab to links by default (macOS setting)");
  await page.goto("katalog/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
});
