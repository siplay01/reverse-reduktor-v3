// Screenshots for visual review: node qa/shots.mjs [widths] [scheme] [engine]   (preview server on :4321)
import { chromium, webkit, firefox } from "@playwright/test";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE || "http://localhost:4321/reverse-reduktor-v3/";
const widths = (process.argv[2] || "390,1440").split(",").map(Number);
const scheme = process.argv[3] || "light";
const engine = { chromium, webkit, firefox }[process.argv[4] || "chromium"];
const pages = (process.env.PAGES || "|katalog/|katalog/rr-300/|katalog/detal/1225m-48-1/|katalog/rr-300/uzly/ris-05/|oborudovanie/rr-300/|zapros/|dokumentaciya/|tendery/|o-kompanii/|kontakty/").split("|");
mkdirSync("qa/screenshots", { recursive: true });
const b = await engine.launch();
for (const w of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto(BASE + "katalog/detal/525-16-400/");
  await pg.evaluate(() => localStorage.setItem("rr-request-v3", JSON.stringify([
    { id: "525-16-400", d: "525-16-400", n: "Полумуфта ведомая", q: 2 },
    { id: "1225m-48-1", d: "1225М-48-1", n: "Шестерня переднего хода ведущая", q: 1 }])));
  for (const p of pages) {
    await pg.goto(BASE + p, { waitUntil: "networkidle" });
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
    await pg.waitForLoadState("networkidle");
    const name = `qa/screenshots/${engine.name()}-${scheme}-${w}-${(p || "home").replace(/\/$/, "").replace(/\//g, "_")}.png`;
    if (process.env.SLICE) { // slices of SLICE px height, for reading details
      const H = Number(process.env.SLICE), total = await pg.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0, i = 0; y < total && i < Number(process.env.MAXSLICES || 6); y += H, i++)
        await pg.screenshot({ path: name.replace(".png", `-s${i}.png`), fullPage: true, clip: { x: 0, y, width: w, height: Math.min(H, total - y) } });
    } else await pg.screenshot({ path: name, fullPage: process.env.FULL !== "0" });
  }
  await ctx.close();
}
await b.close();
console.log("done");
