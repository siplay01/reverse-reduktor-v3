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
| 4 models: specs, applicability, description | `reconstruction/normalized/models.json` | The site shows one value per characteristic (`client_specs()` in `scripts/prepare.py`): RR-300 from the manual where it is more precise, power and ratios from the catalog variant table; dimensions dropped (same number for all four models). Headline values: `KEY_SPECS`. Every choice is listed in `../results/11_v3_pamyatka.html`. |
| RR-300 variants table (10 исполнений) | `models.json` `variants`, source «каталог РР-300, табл. 2» | |
| Spec conflicts | `reconstruction/manifests/conflicts.csv` (type `model_spec`) | Not shown on the site; listed in the memo. |
| 26 RR-300 assemblies, drawings, spec scans | `reconstruction/normalized/assemblies.json` (7 tables checked earlier) + `data-src/specs_transcribed.txt` (19 tables typed by eye from the scans on 2026-10-27: 152 rows with quantities per variant, mass, material, footnotes) | Part-to-node links are rebuilt from these tables only. The variant table of the catalog agrees with the transcribed gears (fig. 11, 13, 16). |
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

## Prices

Shown on cards, part and model pages (Dmitry, 2026-10-28: internal demo): revers-remont.ru archive 2025-2026 first, else revers-reduktor.ru (`price()` in `scripts/prepare.py`). Not in structured data. Parts without any price say «Цена по запросу».

## Owner list of gaps

`python3 -I scripts/missing_report.py` writes `../results/12_chego_ne_hvataet.html` (no price, no photo, no description, OCR numbers, documents).

## Deliberately not published

- Stock availability: no data.
- Claims from the old site with no supporting document: «официальный представитель производителя», «гарантия 12 месяцев», «сертифицированное оборудование», «оригинальные запчасти», «бесплатная консультация». V1 still shows «гарантия 12 месяцев»; V3 does not.
- Phones of revers-reduktor.ru (+7 903 990-11-49, +7 960 966-55-77): different from the operator's contact set.
- Per-part dimensions or materials: not in any source. The part page says so.

## Not on the site

- 9 OCR-only designations (e.g. `353-201`) are published as read (Dmitry, 2026-10-28) and listed in `src/data/dropped-parts.json` for checking against the scan.
- The sources page, verification badges and archive remarks of the first V3 were removed on Dmitry's request; the same facts are in this file and in the memo.

## Open questions for the owner

1. Rights to publish photos, catalog scans and the manual (all shown on the demo).
2. Current РКО certificate (the shown one ended 11.06.2026).
3. Address 24ж vs 26.
4. Any list of tenders or contracts the owner wants shown.
5. Whether the warranty statement (12 months) can be documented and restored.
6. Verification of the 19 OCR assembly tables against the scans (quantities hidden until then).
