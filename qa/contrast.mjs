// WCAG contrast of token pairs in light and dark themes: node qa/contrast.mjs
import { readFileSync } from "node:fs";
const css = readFileSync("src/styles/global.css", "utf8");
const block = (re) => Object.fromEntries([...css.match(re)[1].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const light = block(/:root \{([\s\S]*?)\n\}/);
const dark = { ...light, ...block(/prefers-color-scheme: dark\) \{\s*:root \{([\s\S]*?)\}/) };
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [ // [fg, bg, minimum]
  ["text", "bg", 4.5], ["text", "surface", 4.5], ["text", "surface-2", 4.5], ["muted", "bg", 4.5], ["muted", "surface", 4.5], ["muted", "surface-2", 4.5],
  ["accent", "surface", 4.5], ["accent", "bg", 4.5], ["accent", "surface-2", 4.5], ["on-accent", "accent", 4.5], ["on-accent", "accent-hover", 4.5],
  ["on-ink", "ink", 4.5], ["danger", "surface", 4.5], ["text", "accent-soft", 4.5], ["line-strong", "surface", 3], ["line-strong", "bg", 3],
];
let fail = 0;
for (const [name, t] of [["light", light], ["dark", dark]])
  for (const [f, b, min] of pairs) { const r = ratio(t[f], t[b]); if (r < min) { fail++; console.log(`FAIL ${name} ${f} on ${b}: ${r.toFixed(2)} < ${min}`); } }
console.log(`${pairs.length * 2} pairs, ${fail} failures`);
process.exit(fail ? 1 : 0);
