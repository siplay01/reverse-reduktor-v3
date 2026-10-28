"""Owner list of what the V3 demo still lacks, built from src/data (run after prepare.py):
    python3 -I scripts/missing_report.py   ->  ../results/12_chego_ne_hvataet.html
"""
import html, json
from pathlib import Path

V3 = Path(__file__).resolve().parent.parent
D = V3 / "src" / "data"
OUT = V3.parent / "results" / "12_chego_ne_hvataet.html"
MODEL = {"rr300": "РР-300", "rr238": "РР-238", "3d6": "3Д6", "3d12": "3Д12"}

parts = json.loads((D / "parts.json").read_text(encoding="utf-8"))
ocr = {p["designation"] for p in json.loads((D / "dropped-parts.json").read_text(encoding="utf-8"))}
e = html.escape


def table(rows):
    body = "".join(f"<tr><td class=sku>{e(p['designation'])}</td><td>{e(p['name'])}</td><td>{e(', '.join(MODEL.get(m, m) for m in p['models']))}</td></tr>" for p in rows)
    return f"<div class=wrap><table><thead><tr><th>Обозначение</th><th>Наименование</th><th>Модель</th></tr></thead><tbody>{body}</tbody></table></div>"


groups = [
    ("Нет цены", "На сайте у этих позиций написано «Цена по запросу». Остальные цены взяты из архива revers-remont.ru (2025-2026) или с revers-reduktor.ru и требуют обновления.",
     [p for p in parts if not p["price"]]),
    ("Нет фото", "На сайте вместо фото показана табличка с обозначением.", [p for p in parts if not p["photos"]]),
    ("Нет описания", "Страница детали есть, текст описания пустой.", [p for p in parts if not p["description"]]),
    ("Обозначение прочитано распознаванием, сверить со сканом", "Позиции есть на сайте, но номер мог прочитаться с ошибкой (например, к номеру прилипла цифра сноски).",
     [p for p in parts if p["designation"] in ocr]),
]
other = [
    "Свидетельство РКО № 06483: на сайте показано, по документу действовало до 11.06.2026. Нужен действующий документ.",
    "Все цены архивные (2025-2026). Нужен актуальный прайс-лист.",
    "Наличие и сроки поставки: данных нет, на сайте «по запросу».",
    "Адрес: Зоотехническая, 24ж или 26 (источники расходятся).",
    "Тендеры: список контрактов отсутствует, страница ссылается на поиск в ЕИС по ИНН.",
    "Гарантия 12 месяцев и другие заявления старого сайта: нужен документ, тогда вернём на сайт.",
    "Права на фото, сканы каталога и руководство.",
    "Полный текст старой страницы «Ремонт» не сохранился.",
]
toc = "".join(f"<li><a href=#g{i}>{e(t)}</a>: {len(r)}</li>" for i, (t, _, r) in enumerate(groups))
secs = "".join(f"<h2 id=g{i}>{e(t)} ({len(r)})</h2><p>{e(n)}</p>{table(r)}" for i, (t, n, r) in enumerate(groups))
OUT.write_text(f"""<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Чего не хватает на сайте</title><style>
:root{{color-scheme:light dark;--bg:#fff;--tx:#121517;--mu:#535a61;--ln:#d9dde0;--ac:#bf2a1d}}
@media (prefers-color-scheme:dark){{:root{{--bg:#15181a;--tx:#e8eaec;--mu:#a3abb2;--ln:#30363b;--ac:#ff7a6b}}}}
body{{margin:0;padding:16px;background:var(--bg);color:var(--tx);font:16px/1.5 system-ui,-apple-system,sans-serif}}
main{{max-width:900px;margin:0 auto}}h1{{font-size:26px;line-height:1.2}}h2{{margin-top:36px;font-size:20px}}p,li{{color:var(--tx)}}.mu{{color:var(--mu)}}
a{{color:var(--ac)}}.wrap{{overflow-x:auto}}table{{border-collapse:collapse;width:100%;font-size:14px}}
th,td{{border-bottom:1px solid var(--ln);padding:6px 8px;text-align:left;vertical-align:top}}th{{color:var(--mu);font-weight:600}}
.sku{{font-family:ui-monospace,Menlo,monospace;white-space:nowrap;color:var(--ac)}}
</style></head><body><main>
<h1>Чего не хватает на сайте (V3)</h1>
<p class=mu>Все {len(parts)} позиций каталога на сайте есть. Ниже то, что нужно восстановить или прислать. Список собран из данных сайта автоматически.</p>
<ul>{toc}</ul>
<h2>Документы и прочее</h2><ul>{"".join(f"<li>{e(x)}</li>" for x in other)}</ul>
{secs}
</main></body></html>
""", encoding="utf-8")
print(OUT, {t: len(r) for t, _, r in groups})
