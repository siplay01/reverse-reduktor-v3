// Company and site settings. Sources for every value: CONTENT_SOURCES.md.
export const COMPANY = {
  brand: "Реверс-редуктор",
  operator: "ООО «Дело»",
  inn: "2225060059",
  kpp: "222501001",
  ogrn: "1032202271309",
  phone: "+7 996 704-22-05",
  tel: "+79967042205",
  email: "sibflot.servis@yandex.ru",
  address: "Алтайский край, г. Барнаул, пос. Южный, ул. Зоотехническая, 24ж",
  hours: "пн–пт, 9:00–17:00",
};

export const SETTINGS = {
  // Demo on GitHub Pages: rights to photos and texts are not confirmed, so search engines are kept out.
  // Set INDEXABLE=1 at build time on the production domain: robots.txt and meta robots switch to index.
  indexable: process.env.INDEXABLE === "1",
  // Yandex Metrika counter number. null = no counter code at all. Before enabling, add a consent banner
  // (152-ФЗ: analytics only after consent).
  metrikaId: null as number | null,
};

/** Build a link that works under the GitHub Pages base path and on an own domain. */
export const url = (path = "") => import.meta.env.BASE_URL + path.replace(/^\//, "");

export const fmtSize = (bytes: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(bytes / 1048576) + " МБ";
