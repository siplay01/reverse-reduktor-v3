# Content sources (V3)

Every fact on the V3 site traces to a file below. Nothing was added beyond these sources. Paths are relative to `~/Documents/Projects/Reductor/`.

## Pipeline

```
reconstruction/normalized/*.json  ──┐
reconstruction/manifests/conflicts.csv ─┤
src_extract/rr300_catalog/*.jpg  ───┼─ v3/scripts/prepare.py ─> v3/src/data/*.json + v3/public/img + v3/public/docs
site/img/site/*.jpg (owner photos) ─┤
site/docs/rr300-re.pdf ─────────────┘
```

`reconstruction/` is the audited recovery from the earlier session (see `reconstruction/STATUS.md`, `reconstruction/reports/RECOVERY_COVERAGE.md`). V3 does not re-derive it; it only reshapes it for the site.

## Data on the site

| Site content | Source | Notes |
| --- | --- | --- |
| 307 part designations, names, model links | `reconstruction/normalized/parts.json` | 149 from revers-remont.ru (Tilda store API, live, 177 records), 85 confirmed by catalog scan, 46 OCR only, 27 from revers-reduktor.ru only. Each part page shows its own confidence and source. |
| Part photos (199 parts) | same file, `photos[]` → `reconstruction/raw/tilda-img/`, `reconstruction/raw/external/revers-reduktor.ru-img-full/` | Watermarks kept as in the source. Tiny Tilda previews (< 4 KB) are dropped when a larger photo of the same part exists. |
| Part descriptions | `parts.json` `description` (old store text) | Boilerplate lines («Применение», «Используется при…») and unconfirmed claims removed (regex `CLAIMS` in `scripts/prepare.py`); «оригинальная запчасть» shortened to «запчасть». Meaning otherwise unchanged. |
| Part type filter | first word of the catalog name, grouped in `scripts/prepare.py` (`TYPES`) | Derived from the real name only. |
| 4 models: specs, applicability, description | `reconstruction/normalized/models.json` | Specs show every source value side by side. Description lines from the old site home text (Exa index), claim lines removed. |
| RR-300 variants table (10 исполнений) | `models.json` `variants`, source «каталог РР-300, табл. 2» | |
| Spec conflicts box | `reconstruction/manifests/conflicts.csv` (type `model_spec`) | 16-finger power (150 vs 300 hp), reverse ratios, identical dimensions on all models. |
| 26 RR-300 assemblies, drawings, spec scans | `reconstruction/normalized/assemblies.json`, scans in `src_extract/rr300_catalog/` | 7 tables verified row by row against the scan (with quantities); 19 OCR only (no quantities, rows flagged «проверить по скану»). |
| 89 catalog scan pages | `src_extract/rr300_catalog/` | Owner's scan of «Каталог деталей и сборочных единиц РР-300». |
| Manual PDF (24 pages) | `site/docs/rr300-re.pdf` | Byte-identical to `~/Downloads/Reductor/Руководство РР300 А4.pdf` (checked with `cmp`). |
| Hero, workshop, flange photos; РКО certificate | `site/img/site/*.jpg` | Owner photos from `~/Downloads/Reductor` (copied there in the V1 session). The old site's «Turbotext_AI_Image» pictures are AI-generated and are not used. |

## Company and contacts

| Value | Source |
| --- | --- |
| Operator ООО «Дело», ИНН 2225060059, КПП 222501001, ОГРН 1032202271309 | РКО certificate image + V1 `site/config.js`; Dmitry's decision of 2026-10-27 (PROGRESS.md) to use ООО «Дело» as operator. |
| Phone +7 996 704-22-05, e-mail sibflot.servis@yandex.ru | revers-remont.ru contacts (archive 15.04.2025); the phone is also confirmed by FIS.ru, Yandex Maps, TopServer, orgs.biz. |
| Address ул. Зоотехническая, 24ж | Dmitry's decision (V1). Conflict: revers-remont.ru and Yandex Maps say «Зоотехническая, 26»; FIS.ru and orgs.biz say «24ж». |
| Hours пн–пт 9:00–17:00, сб–вс выходные | revers-remont.ru contacts page. |
| РКО certificate № 06483, scope, dates 11.06.2024–11.06.2026 | Certificate image `site/img/site/rko-06483.jpg`. Shown as expired by its own date. |

## Text pages

| Page | Source |
| --- | --- |
| Ремонт | revers-remont.ru pages «Ремонт реверс-редукторов, муфт сцепления и рулевых машин» and «О нас» (search-index text). The full repair page text did not survive anywhere. |
| О компании | «О нас» text minus unconfirmed claims; РКО scope from the certificate. |
| Доставка и оплата | revers-remont.ru block «Как оформить заявку?» and product-card order terms. |
| Тендеры | One sentence on the archived April 2025 home page: «Мы работаем по всей России и активно участвуем в государственных контрактах и закупках.» No list of tenders, contract numbers or dates exists in any recovered source (`original-replica/reports/CONTENT_GAPS.md`). The page says so and links a ЕИС search by ИНН instead of inventing a history. |

## Deliberately not published

- Prices: archive prices (2025) exist in `parts.json` `price_archive` but are not current. Not shown, not in structured data.
- Stock availability: no data.
- Claims from the old site with no supporting document: «официальный представитель производителя», «гарантия 12 месяцев», «сертифицированное оборудование», «оригинальные запчасти», «бесплатная консультация». V1 still shows «гарантия 12 месяцев»; V3 does not.
- Phones of revers-reduktor.ru (+7 903 990-11-49, +7 960 966-55-77): different from the operator's contact set.
- Per-part dimensions or materials: not in any source. The part page says so.

## Open questions for the owner

1. Rights to publish photos, catalog scans and the manual (all shown on the demo).
2. Current РКО certificate (the shown one ended 11.06.2026).
3. Address 24ж vs 26.
4. Any list of tenders or contracts the owner wants shown.
5. Whether the warranty statement (12 months) can be documented and restored.
6. Verification of the 19 OCR assembly tables against the scans (quantities hidden until then).
