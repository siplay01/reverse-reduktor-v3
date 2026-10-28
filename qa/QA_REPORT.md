# QA report, V3 (2026-10-27)

All results below come from the production build (`npm run build`, served by `astro preview`). Reproduce with `npm test` and the Lighthouse loop in this file's last section.

## Automated checks

| Check | Result |
| --- | --- |
| Type check (`astro check`) | 29 files, 0 errors, 0 warnings |
| Static build check (`qa/links.mjs`) | 355 HTML files, 16 619 internal links and assets resolve, 1 h1 per page, unique titles and descriptions, no em dashes: 0 problems |
| Token contrast (`qa/contrast.mjs`) | 44 pairs, light and dark: 0 failures (2 fixed during QA: `--line-strong`, focus ring on navy bands) |
| Playwright, Chromium (Desktop Chrome) | 11 passed, 1 skipped (mobile-only test) |
| Playwright, WebKit (Desktop Safari engine) | 10 passed, 2 skipped (mobile-only; Tab-to-link keyboard test, WebKit default) |
| Playwright, iPhone 13 (WebKit, touch, 390 px) | 10 passed, 2 skipped (desktop-only width sweep and keyboard test) |
| Playwright, Edge profile (Chromium engine, Edge UA) | 11 passed, 1 skipped |
| Playwright, Firefox | Not runnable locally (sandbox blocks its profile folder). Passed in GitHub Actions: 11 passed, 1 skipped. CI total: 53 passed, 7 skipped, 0 failed. |
| Live site (https://siplay01.github.io/reverse-reduktor-v3/), `PW_URL=... npx playwright test` | Chromium, WebKit, iPhone WebKit: 31 passed, 5 skipped, 0 failed |

Tests cover: direct opening of 18 routes (HTTP 200, one h1, no JS errors, no broken images after scrolling), 404 page, search (exact designation first; spaces, hyphens, Latin look-alikes `sb`/`cб`; partial; Russian words in any case; empty state and reset), home search hand-off, filters by model/type/node/photo with URL state restored after reload, «Показать ещё», catalog → model → part → node navigation, request list (add from product page with quantity, from card, from node table; header counter; change quantity by stepper and typing; delete; persistence after reload; validation when no contact; mailto text with every line and contact; preview; clear), mobile menu (open, Escape, navigate), PDF served as `application/pdf` with a real `%PDF-` header, scan lightbox open/close, no horizontal scroll and no clipped or squeezed header controls at 320, 375, 390, 430, 768, 1024, 1366, 1440, 1920 px on 9 page types, skip link and visible focus.

## Lighthouse 12 (local preview, default mobile emulation unless noted)

| Page | Perf | A11y | Best pr. | SEO* | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Home | 91 | 100 | 100 | 66 | 3.5 s | 0 |
| Catalog | 97 | 100 | 100 | 63 | 2.3 s | 0.002 |
| Part page | 96 | 100 | 100 | 66 | 2.6 s | 0.045 |
| Node (рис. 5) | 98 | 100 | 100 | 66 | 2.1 s | 0 |
| Model РР-300 | 95 | 100 | 100 | 66 | 2.8 s | 0 |
| Request list | 100 | 100 | 100 | 63 | 1.7 s | 0 |
| Tenders | 99 | 100 | 100 | 63 | 1.8 s | 0.011 |
| Documents | 100 | 100 | 100 | 63 | 1.7 s | 0 |
| Home, desktop preset | 100 | 100 | 100 | 66 | 0.8 s | 0 |
| Catalog, desktop preset | 90 | 100 | 100 | 63 | 0.6 s | |

\*SEO is low only because the demo carries `noindex` on purpose. The same build with `INDEXABLE=1` scores SEO 100 on the home and part pages.

Two runs per page gave identical scores. These are lab numbers from one machine with simulated slow 4G, not field Core Web Vitals. Home and model pages miss the 2.5 s LCP lab target on simulated mobile: the LCP element is the hero text, delayed by web-font swap (removing the fonts gave 2.9 s) and the first images. Done: CSS inlined, Cyrillic fonts preloaded, home tiles lazy. Next option if field data confirms it: `font-display: optional` or system fonts for body text.

## Visual review

Screenshots (gitignored, regenerate with `qa/shots.mjs`) were taken and looked at for: home, catalog, model catalog, part page, node page, model page, request list, documents, tenders, about, contacts; at 320, 390, 768, 1024, 1440, 1920 px; light and dark; Chromium and WebKit. Issues found and fixed:

1. Portrait photo stretched the 3Д12 model tile; tiles now crop to 4:3 (model photos only; part photos are never cropped).
2. Catalog opened with a wall of «Фото нет» cards; default order is now «сначала с фото».
3. 307 cards in one 31 000 px page; now 48 per step with «Показать ещё» (all cards stay in the HTML for search engines).
4. Product page showed a green «Добавить в запрос» after adding, which read as disabled; now the button stays primary and a line shows «В списке запроса: N шт.».
5. Request rows inherited the home `.info` card style (class clash).
6. Model page gallery thumbnails widened the page at ≤ 768 px (grid min-content); all two-column grids now use `minmax(0, 1fr)`.
7. Header at 320 px squeezed the menu button to 36 px; wordmark hidden below 360 px. The layout test was extended and confirmed to fail on the old CSS.
8. Placeholders truncated on phones; shortened.

## Not verified

- Real Safari on macOS and iOS devices and real Edge. WebKit and Chromium engines were tested through Playwright only.
- The ЕИС search link on the tenders page (zakupki.gov.ru is often unreachable from outside Russia).

## Lighthouse loop

```
CHROME_PATH=$(node -e "console.log(require('@playwright/test').chromium.executablePath())") \
npx lighthouse@12 http://localhost:4321/reverse-reduktor-v3/<page> --output=json --output-path=qa/lighthouse/<name>.json
```
