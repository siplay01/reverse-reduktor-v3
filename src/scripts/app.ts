// Client behaviour: menu, request list (localStorage), catalog search/filters, gallery, lightbox.
// Nothing here talks to a server. To connect a backend later, replace buildMail()/mailto with a POST in rfqPage().

// ---------------------------------------------------------------- search key
const LAT: Record<string, string> = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х", Y: "У", D: "Д" };
/** Designation key: Latin look-alikes and transliterations -> Cyrillic, one dash type, no spaces, upper case. */
export function key(s: string): string {
  return String(s || "").toUpperCase().replace(/Ё/g, "Е")
    .replace(/(^|[^A-ZА-Я])(SB|CB)/g, "$1СБ").replace(/(^|[^A-ZА-Я])(RR|PP)/g, "$1РР").replace(/3D/g, "3Д")
    .replace(/[A-Z]/g, (c) => LAT[c] ?? c)
    .replace(/[‐-―−_]/g, "-").replace(/\s+/g, "");
}
const bare = (s: string) => key(s).replace(/[-./]/g, "");
const words = (s: string) => s.toLowerCase().replace(/ё/g, "е").split(/\s+/).filter(Boolean);

/** 100 exact designation, 60 prefix, 40 substring, 20 all words in name/designation, 0 no match. */
export function score(keys: string[], name: string, q: string): number {
  const bq = bare(q);
  if (!bq) return 1;
  let best = 0;
  for (const k of keys) {
    const b = bare(k);
    if (b === bq) return 100;
    if (bq.length >= 2 && b.startsWith(bq)) best = Math.max(best, 60);
    else if (bq.length >= 3 && b.includes(bq)) best = Math.max(best, 40);
  }
  if (best) return best;
  const n = name.toLowerCase().replace(/ё/g, "е");
  const ok = words(q).every((w) => n.includes(w) || (bare(w).length >= 2 && keys.some((k) => bare(k).includes(bare(w)))));
  return ok ? 20 : 0;
}

// ---------------------------------------------------------------- request list store
type Item = { id: string; d: string; n: string; q: number; img?: string; href?: string };
const STORE = "rr-request-v3";
const MAXQ = 9999;
let mem: Item[] | null = null; // fallback when storage is blocked: the list lives until reload
export const rfq = {
  get(): Item[] {
    if (mem) return mem;
    try { const v = JSON.parse(localStorage.getItem(STORE) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
  },
  set(v: Item[]) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { mem = v; } paint(); },
  add(it: Item) { const l = rfq.get(); const x = l.find((i) => i.id === it.id); if (x) x.q = clampQ(x.q + it.q); else l.push({ ...it, q: clampQ(it.q) }); rfq.set(l); },
  remove(id: string) { rfq.set(rfq.get().filter((i) => i.id !== id)); },
  qty(id: string, q: number) { const l = rfq.get(); const x = l.find((i) => i.id === id); if (x) { x.q = clampQ(q); rfq.set(l); } },
};
const clampQ = (n: number) => Math.min(MAXQ, Math.max(1, Math.round(Number(n) || 1)));

function paint() {
  const list = rfq.get();
  const n = list.length;
  document.querySelectorAll<HTMLElement>("[data-rfq-count]").forEach((el) => (el.textContent = n ? String(n) : ""));
  document.querySelectorAll<HTMLButtonElement>("[data-rfq-add]:not([data-qty])").forEach((b) => {
    const on = list.some((i) => i.id === b.dataset.id);
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? "В запросе ✓" : "В запрос";
  });
  // product pages: the button always adds the chosen quantity; the current amount is shown next to it
  document.querySelectorAll<HTMLElement>("[data-in-list]").forEach((el) => {
    const it = list.find((i) => i.id === el.dataset.inList);
    el.hidden = !it;
    el.querySelector("[data-in-list-text]")!.textContent = it ? `В списке запроса: ${it.q} шт.` : "";
  });
}

function announce(t: string) {
  const live = document.getElementById("live");
  if (live) { live.textContent = ""; setTimeout(() => (live.textContent = t), 30); }
}
let toastTimer = 0;
function toast(t: string) {
  const el = document.querySelector<HTMLElement>("[data-toast]");
  if (!el || location.pathname.endsWith("/zapros/")) return announce(t);
  el.querySelector("[data-toast-text]")!.textContent = t;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), 4000);
  announce(t);
}

document.addEventListener("click", (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>("[data-rfq-add]");
  if (!b) return;
  const d = b.dataset;
  const qInput = d.qty ? document.querySelector<HTMLInputElement>(d.qty) : null;
  const inList = rfq.get().some((i) => i.id === d.id);
  if (inList && !qInput) { rfq.remove(d.id!); toast(`Убрано из запроса: ${d.d}`); return; }
  const q = qInput ? clampQ(Number(qInput.value)) : 1;
  rfq.add({ id: d.id!, d: d.d!, n: d.n!, q, img: d.img, href: d.href });
  toast(`${d.d} добавлено в запрос${qInput ? `, ${q} шт.` : ""}. Позиций в списке: ${rfq.get().length}`);
});

// ---------------------------------------------------------------- menu
const menuBtn = document.querySelector<HTMLButtonElement>("[data-menu]");
const nav = document.getElementById("nav");
menuBtn?.addEventListener("click", () => {
  const open = menuBtn.getAttribute("aria-expanded") !== "true";
  menuBtn.setAttribute("aria-expanded", String(open));
  nav?.classList.toggle("open", open);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav?.classList.contains("open")) { nav.classList.remove("open"); menuBtn?.setAttribute("aria-expanded", "false"); menuBtn?.focus(); }
});

// ---------------------------------------------------------------- quantity steppers
document.addEventListener("click", (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>("[data-step]");
  if (!b) return;
  const input = b.parentElement!.querySelector("input")!;
  input.value = String(clampQ(Number(input.value) + Number(b.dataset.step)));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});

// ---------------------------------------------------------------- gallery + lightbox
const dlg = document.querySelector<HTMLDialogElement>("[data-lightbox]");
document.addEventListener("click", (e) => {
  const t = (e.target as Element).closest<HTMLElement>("[data-thumb]");
  if (t) {
    const g = t.closest("[data-gallery]")!;
    const main = g.querySelector<HTMLImageElement>("[data-main]")!;
    main.src = t.dataset.thumb!; main.width = Number(t.dataset.w); main.height = Number(t.dataset.h);
    (main.parentElement as HTMLAnchorElement).href = t.dataset.thumb!;
    g.querySelectorAll("[data-thumb]").forEach((x) => x.setAttribute("aria-current", String(x === t)));
    return;
  }
  const z = (e.target as Element).closest<HTMLAnchorElement>("[data-zoom]");
  if (z && dlg && typeof dlg.showModal === "function" && !(e as MouseEvent).metaKey && !(e as MouseEvent).ctrlKey) {
    e.preventDefault();
    const img = dlg.querySelector<HTMLImageElement>("[data-lightbox-img]")!;
    img.src = z.href; img.alt = z.querySelector("img")?.alt || z.getAttribute("aria-label") || "";
    dlg.showModal();
  }
});
dlg?.addEventListener("click", (e) => { if (e.target === dlg || (e.target as Element).closest("[data-lightbox-close]") || (e.target as Element).classList.contains("inner")) dlg.close(); });

// ---------------------------------------------------------------- catalog
function catalog(root: HTMLElement) {
  const cards = [...root.querySelectorAll<HTMLElement>("[data-card]")].map((el) => ({
    el, keys: el.dataset.k!.split("|"), name: el.dataset.n!, models: el.dataset.m!.split(" "), type: el.dataset.t!,
    figs: (el.dataset.a || "").split(" ").filter(Boolean), photo: el.dataset.p === "1", order: Number(el.dataset.o),
    d: el.querySelector(".sku")!.textContent!, n: el.querySelector(".ttl")!.textContent!,
  }));
  const grid = root.querySelector<HTMLElement>("[data-results]")!;
  const form = root.querySelector<HTMLFormElement>("[data-search]")!;
  const input = form.querySelector("input")!;
  const sortSel = root.querySelector<HTMLSelectElement>("[data-sort]")!;
  const uzel = root.querySelector<HTMLSelectElement>('[data-f="uzel"]');
  const photo = root.querySelector<HTMLInputElement>('[data-f="photo"]')!;
  const types = [...root.querySelectorAll<HTMLInputElement>('[data-f="type"]')];
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-f="model"]')];
  const countEl = root.querySelector<HTMLElement>("[data-count]")!;
  const fcount = root.querySelector<HTMLElement>("[data-fcount]");
  const panel = root.querySelector<HTMLElement>("#filters")!;
  const toggle = root.querySelector<HTMLButtonElement>("[data-filters-toggle]");

  const p = new URLSearchParams(location.search);
  input.value = p.get("q") || "";
  const setModel = (v: string) => chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.v === v)));
  setModel(p.get("model") || "");
  const tSel = p.getAll("type");
  types.forEach((t) => (t.checked = tSel.includes(t.value)));
  if (uzel) uzel.value = p.get("uzel") || "";
  photo.checked = p.get("photo") === "1";
  sortSel.value = p.get("sort") || "";

  // ponytail: client-side paging over server-rendered cards; fine for hundreds of parts, move to per-page HTML at thousands.
  const PAGE = 48;
  let limit = PAGE, keepLimit = false;
  const more = root.querySelector<HTMLButtonElement>("[data-more]")!;
  more.addEventListener("click", () => {
    const first = limit; limit += PAGE; keepLimit = true; apply(false); keepLimit = false;
    grid.querySelectorAll<HTMLElement>("[data-card]:not([hidden])")[first]?.querySelector<HTMLElement>(".ttl")?.focus();
  });
  function apply(push = true) {
    const q = input.value.trim();
    const model = chips.find((c) => c.getAttribute("aria-pressed") === "true")?.dataset.v || "";
    const ts = types.filter((t) => t.checked).map((t) => t.value);
    const fig = uzel?.value || "";
    const sort = sortSel.value;
    const shown = cards
      .map((c) => ({ c, s: score(c.keys, c.name, q) }))
      .filter(({ c, s }) => s > 0 && (!model || c.models.includes(model)) && (!ts.length || ts.includes(c.type)) && (!fig || c.figs.includes(fig)) && (!photo.checked || c.photo));
    shown.sort((a, b) => (q ? b.s - a.s : 0) ||
      (sort === "d" ? a.c.d.localeCompare(b.c.d, "ru", { numeric: true }) : sort === "n" ? a.c.n.localeCompare(b.c.n, "ru") : a.c.order - b.c.order));
    if (!keepLimit) limit = PAGE;
    const vis = new Set(shown.slice(0, limit).map((x) => x.c));
    cards.forEach((c) => (c.el.hidden = !vis.has(c)));
    more.hidden = shown.length <= limit;
    more.textContent = `Показать ещё ${Math.min(PAGE, shown.length - limit)} из ${shown.length - limit}`;
    shown.forEach((x) => grid.appendChild(x.c.el));
    root.querySelector<HTMLElement>("[data-empty]")!.hidden = shown.length > 0;
    countEl.textContent = q ? `Найдено: ${shown.length}` : `Позиций: ${shown.length}`;
    const active = (model ? 1 : 0) + ts.length + (fig ? 1 : 0) + (photo.checked ? 1 : 0);
    if (fcount) fcount.textContent = active ? ` (${active})` : "";
    if (push) {
      const u = new URLSearchParams();
      if (q) u.set("q", q);
      if (model) u.set("model", model);
      ts.forEach((t) => u.append("type", t));
      if (fig) u.set("uzel", fig);
      if (photo.checked) u.set("photo", "1");
      if (sort) u.set("sort", sort);
      history.replaceState(null, "", location.pathname + (u.toString() ? `?${u}` : ""));
    }
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); apply(); grid.scrollIntoView({ block: "start", behavior: "smooth" }); });
  let deb = 0;
  input.addEventListener("input", () => { clearTimeout(deb); deb = window.setTimeout(apply, 120); });
  chips.forEach((c) => c.addEventListener("click", () => { setModel(c.dataset.v!); apply(); }));
  [...types, photo, sortSel, ...(uzel ? [uzel] : [])].forEach((el) => el.addEventListener("change", () => apply()));
  root.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", () => {
    input.value = ""; setModel(""); types.forEach((t) => (t.checked = false)); if (uzel) uzel.value = ""; photo.checked = false; sortSel.value = ""; apply(); input.focus();
  }));
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open)); panel.classList.toggle("open", open);
  });
  apply(false);
}
document.querySelectorAll<HTMLElement>("[data-catalog]").forEach(catalog);

// ---------------------------------------------------------------- request page
function buildText(list: Item[], f: Record<string, string>): string {
  const lines = ["Запрос коммерческого предложения", ""];
  list.forEach((x, i) => lines.push(`${i + 1}. ${x.d} ${x.n}: ${x.q} шт.`));
  lines.push("");
  if (f.note) lines.push(`Комментарий: ${f.note}`, "");
  const who = [["Контактное лицо", f.name], ["Организация", f.org], ["Телефон", f.tel], ["E-mail", f.email]].filter(([, v]) => v);
  who.forEach(([k, v]) => lines.push(`${k}: ${v}`));
  return lines.join("\n");
}

function rfqPage(root: HTMLElement) {
  const ul = root.querySelector<HTMLElement>("[data-rows]")!;
  const tpl = root.querySelector<HTMLTemplateElement>("#rfq-row")!;
  const fields = ["name", "org", "tel", "email", "note"].map((n) => root.querySelector<HTMLInputElement>(`[name="${n}"]`)!);
  const preview = root.querySelector<HTMLElement>("[data-preview]")!;
  const mail = root.querySelector<HTMLAnchorElement>("[data-mail]")!;
  const status = root.querySelector<HTMLElement>("[data-status]")!;
  const errBox = root.querySelector<HTMLElement>("[data-err]")!;
  const DRAFT = "rr-request-draft";
  try { const d = JSON.parse(localStorage.getItem(DRAFT) || "{}"); fields.forEach((f) => (f.value = d[f.name] || "")); } catch { /* no draft */ }

  const values = () => Object.fromEntries(fields.map((f) => [f.name, f.value.trim()]));
  function refreshText() {
    const list = rfq.get();
    const text = buildText(list, values());
    preview.textContent = text;
    mail.href = `mailto:${root.dataset.email}?subject=${encodeURIComponent(`Запрос КП: ${list.length} поз.`)}&body=${encodeURIComponent(text)}`;
    try { localStorage.setItem(DRAFT, JSON.stringify(values())); } catch { /* ignore */ }
  }
  function render() {
    const list = rfq.get();
    root.querySelector<HTMLElement>("[data-empty-list]")!.hidden = list.length > 0;
    root.querySelector<HTMLElement>("[data-has-list]")!.hidden = list.length === 0;
    ul.replaceChildren(...list.map((x) => {
      const li = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
      const a = li.querySelector<HTMLAnchorElement>("[data-link]")!;
      a.href = x.href || "#"; a.textContent = x.n;
      li.querySelector("[data-d]")!.textContent = x.d;
      const th = li.querySelector<HTMLElement>(".th")!;
      if (x.img) { const im = document.createElement("img"); im.src = x.img; im.alt = ""; im.width = 64; im.height = 64; th.replaceChildren(im); }
      const inp = li.querySelector("input")!;
      inp.id = `q-${x.id}`; inp.value = String(x.q);
      li.querySelector("label")!.htmlFor = inp.id;
      li.querySelector("label")!.textContent = `Количество, ${x.d}`;
      inp.addEventListener("change", () => { rfq.qty(x.id, Number(inp.value)); inp.value = String(clampQ(Number(inp.value))); refreshText(); announce(`${x.d}: ${inp.value} шт.`); });
      li.querySelector<HTMLButtonElement>("[data-del]")!.addEventListener("click", () => { rfq.remove(x.id); render(); announce(`Удалено: ${x.d}`); root.querySelector<HTMLElement>("h1")?.focus(); });
      li.querySelector("[data-del]")!.setAttribute("aria-label", `Удалить ${x.d} из запроса`);
      return li;
    }));
    root.querySelector<HTMLElement>("[data-total]")!.textContent = `Позиций: ${list.length}, всего штук: ${list.reduce((s, x) => s + x.q, 0)}`;
    refreshText();
  }
  fields.forEach((f) => f.addEventListener("input", refreshText));

  function valid(): boolean {
    const tel = root.querySelector<HTMLInputElement>('[name="tel"]')!, email = root.querySelector<HTMLInputElement>('[name="email"]')!;
    const ok = !!(tel.value.trim() || email.value.trim()) && (!email.value.trim() || email.checkValidity());
    [tel, email].forEach((f) => f.setAttribute("aria-invalid", String(!ok)));
    errBox.hidden = ok;
    errBox.textContent = ok ? "" : email.value.trim() && !email.checkValidity() ? "Проверьте e-mail: в адресе должен быть знак @ и домен." : "Укажите телефон или e-mail, чтобы менеджер мог ответить.";
    if (!ok) { (tel.value.trim() ? email : tel).focus(); announce(errBox.textContent); }
    return ok;
  }
  mail.addEventListener("click", (e) => {
    if (!valid()) { e.preventDefault(); return; }
    refreshText();
    status.textContent = "Открываем почтовую программу с готовым письмом. Проверьте текст и нажмите «Отправить» в ней. Если программа не открылась, скопируйте текст кнопкой ниже.";
  });
  root.querySelector("[data-copy]")!.addEventListener("click", async () => {
    refreshText();
    try { await navigator.clipboard.writeText(preview.textContent || ""); status.textContent = `Текст запроса скопирован. Вставьте его в письмо на ${root.dataset.email}.`; }
    catch {
      const r = document.createRange(); r.selectNodeContents(preview); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r);
      status.textContent = "Не удалось скопировать автоматически: текст выделен, нажмите Ctrl+C (или «Скопировать» в меню).";
    }
    announce(status.textContent);
  });
  root.querySelector("[data-clear]")!.addEventListener("click", () => { rfq.set([]); render(); status.textContent = "Список очищен."; announce("Список очищен"); });
  render();
  addEventListener("storage", (e) => { if (e.key === STORE) render(); });
}
document.querySelectorAll<HTMLElement>("[data-rfq-page]").forEach(rfqPage);

paint();
addEventListener("storage", (e) => { if (e.key === STORE) paint(); });
addEventListener("pageshow", paint);
