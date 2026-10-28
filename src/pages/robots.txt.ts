import type { APIRoute } from "astro";
import { SETTINGS } from "../lib/site";
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(`${import.meta.env.BASE_URL}sitemap-index.xml`, site).href;
  const body = SETTINGS.indexable ? `User-agent: *\nAllow: /\nDisallow: ${import.meta.env.BASE_URL}zapros/\n\nSitemap: ${sitemap}\n` : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
