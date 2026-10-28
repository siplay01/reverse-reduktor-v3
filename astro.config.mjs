// Static build. SITE_URL / BASE_PATH come from the environment so the same code serves
// GitHub Pages (https://<user>.github.io/<repo>/) and, later, an own domain at "/".
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = process.env.SITE_URL || "https://siplay01.github.io";
const base = process.env.BASE_PATH ?? "/reverse-reduktor-v3/";

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "always" },
  integrations: [sitemap({ filter: (page) => !page.includes("/zapros/") })],
});
