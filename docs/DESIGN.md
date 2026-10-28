# V3 design system «Корпус»

Second V3 design (2026-10-27, after Dmitry's review: the first V3 looked too close to V1). V1's DESIGN_SYSTEM.md governs `../site` only. Tokens live in `src/styles/global.css` `:root`.

## Read and dials

Industrial B2B catalog for fleet engineers and procurement; trust-first, technical. Variance 6, motion 3, density 5.

## What changed against V1 and the first V3

| | V1 / first V3 | «Корпус» |
| --- | --- | --- |
| Header | dark navy band, amber/copper accent | white bar, ink text, red mark, phone in header |
| Palette | navy + amber/copper | cool steel neutrals, ink, one hull-red accent (#bf2a1d, the RR-300 paint colour) |
| Type | system font / IBM Plex | Golos Text (Cyrillic-native, variable) + JetBrains Mono for part numbers |
| Corners | 6-12 px | 2 px everywhere |
| Hero | text left, framed photo right, stats strip | text panel + photo bleeding to the screen edge, search as the main action, no stats |
| Models | four equal tiles + separate "characteristics" page with the same tiles | spec-sheet rows: photo, four key values, «Запчасти» and «Характеристики» as two distinct actions |
| Nodes | hidden behind the catalog | own home section with drawing and a 26-item index, link to the full 89-page scan |
| Services | text cards | bento: photo cell (repair), scan cell (docs), requisites cell (tenders), order flow (delivery) |

## Rules

- One accent (red) for primary actions, part numbers and active marks; secondary actions are ink or outline.
- No internal notes on client pages (sources, verification state, archive remarks). They live in `../results/11_v3_pamyatka.html`; `qa/tests/site.spec.ts` fails if such words appear.
- Part photos sit on white with `object-fit: contain`; a missing photo shows a plate with the designation, no "no photo" text.
- Tables scroll inside `.tbl-wrap` (position: relative, so screen-reader labels never widen the page).
- Light and dark follow the system. Contrast of 16 token pairs per theme is checked by `qa/contrast.mjs`.
- Icons: Tabler outline via `src/components/Icon.astro`; no hand-drawn icons.
