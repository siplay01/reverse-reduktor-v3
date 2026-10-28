// Static check of the production build: every internal href/src in every page resolves to a file in dist/,
// every page has one h1, a unique title and description. Run after `npm run build`: node qa/links.mjs
import { readFileSync, existsSync, statSync } from "node:fs";
import { globSync } from "node:fs";
const BASE = process.env.BASE_PATH ?? "/reverse-reduktor-v3/";
const pages = globSync("dist/**/*.html");
const bad = [], titles = new Map(), descs = new Map();
let links = 0;
const resolve = (u) => {
  const path = decodeURIComponent(u.split(/[?#]/)[0]);
  if (!path.startsWith(BASE)) return `outside base: ${u}`;
  let f = "dist/" + path.slice(BASE.length);
  if (f.endsWith("/")) f += "index.html";
  return existsSync(f) && statSync(f).isFile() ? null : `missing: ${u}`;
};
for (const p of pages) {
  const html = readFileSync(p, "utf8");
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, "&");
    if (/^(https?:|mailto:|tel:|data:|#)/.test(u)) continue;
    links++;
    const err = resolve(u);
    if (err) bad.push(`${p}: ${err}`);
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) for (const part of m[1].split(",")) { links++; const err = resolve(part.trim().split(" ")[0]); if (err) bad.push(`${p}: ${err}`); }
  if (p.endsWith("404.html")) continue;
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) bad.push(`${p}: ${h1} h1`);
  const t = html.match(/<title>([^<]*)<\/title>/)?.[1], d = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!t || !d) bad.push(`${p}: no title/description`);
  titles.set(t, [...(titles.get(t) || []), p]); descs.set(d, [...(descs.get(d) || []), p]);
  if (/—/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) bad.push(`${p}: em dash in copy`);
}
for (const [t, ps] of titles) if (ps.length > 1) bad.push(`duplicate title "${t}": ${ps.join(", ")}`);
for (const [t, ps] of descs) if (ps.length > 1) bad.push(`duplicate description: ${ps.join(", ")}`);
console.log(`pages ${pages.length}, internal links/assets checked ${links}, problems ${bad.length}`);
bad.slice(0, 40).forEach((b) => console.log("  " + b));
process.exit(bad.length ? 1 : 0);
