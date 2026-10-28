# V3 design system «Чертёжный графит»

V3 has its own design system, separate from V1's two variants (`../DESIGN_SYSTEM.md` governs V1 `site/` only). Tokens live in `src/styles/global.css` `:root`.

## Directions considered

| Direction | Idea | Verdict for an industrial catalog |
| --- | --- | --- |
| A. Marine graphite + copper | Deep navy bands, paper-neutral background, copper accent, technical sans + mono for part numbers | Chosen. Reads as engineering, keeps photos and drawings the visual center, copper ties to bronze/brass parts. |
| B. Swiss white | All white, black type, one red accent, heavy grid | Clean but cold; photos with wooden pallets and workshop backgrounds clash with stark white; looks like a generic shop. |
| C. Dark-first «control room» | Dark UI everywhere, neon accent | Drawings and scans are black-on-white paper; a dark page around them glares. Poor for long spec tables. Kept only as the system dark mode. |

## Signature

- Drawing grid texture in the hero only (the one decorative background on the site).
- Key/value tables styled as a drawing title block (`.kv`): ruled cells, muted label column.
- Part designations in IBM Plex Mono, never wrapped, `translate="no"`.

## Tokens (light / dark via `prefers-color-scheme`, no JS)

Roles: `--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--line`, `--line-strong`, `--link`, `--accent` (button fill, focus ring), `--accent-hover`, `--accent-ink` (label on accent), `--accent-text` (copper small text), `--band`, `--band-2`, `--on-band`, `--on-band-muted`, `--band-line`, `--focus-on-band`, `--photo-bg`, `--ok`/`--ok-bg`, `--warn`/`--warn-bg`, `--danger`. Contrast of 44 pairs checked by `qa/contrast.mjs` (text 4.5:1, UI 3:1), 0 failures.

## Type

IBM Plex Sans 400/500/600 and Plex Mono 500, self-hosted via Fontsource (SIL OFL, full Cyrillic), `font-display: swap`, Cyrillic 400/600 preloaded. H1 clamp(28–44 px), home H1 clamp(30–52 px), H2 clamp(22–30 px), H3 18 px, body 16/1.55, lead 18, compact 14–15, small 13, minimum 12 (badges only).

## Spacing and layout

4-px scale (4, 8, 12, 16, 24, 32, 48, 56, 64). Container 1280 px, gutter 16 px (< 700 px) / 24 px, `env(safe-area-inset-*)` respected. Touch targets ≥ 40–44 px. Radii: 6 px cards, 4 px controls, 99 px badges.

## Components

Header (sticky, burger < 1100 px), breadcrumbs, `.btn` / `.btn.ghost` / `.btn.sm`, fields with visible labels, search (`.search.big`), filter chips and checkboxes with counts, catalog card (`.card`: photo on white backing, `object-fit: contain`, designation, name ≤ 3 lines, model/figure, add button), gallery with thumbnails and native `<dialog>` lightbox, title-block table `.kv`, spec table `.tbl` (scrolls inside its own container), drawing figure, document card, step list, request list rows with quantity stepper, toast (`aria-live`), footer.

## States

Default, hover (pointer only, never the only cue), `:focus-visible` 3 px ring, pressed (`aria-pressed` + green fill + «В запросе ✓» label), disabled, empty (catalog, request list), error (request form: message under fields, `aria-invalid`, focus moves to the field). Motion: colors/transform only, 150 ms, inside `prefers-reduced-motion: no-preference`.

## Avoided on purpose

Gradients and glow, glassmorphism, eyebrow caps over every block, reveal-on-scroll, stock or generated images, invented badges or reviews.
