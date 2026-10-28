"""Export recovered data and media into the V3 site.

Reads ../reconstruction/normalized (single source of truth) and owner photos already in ../site/img,
writes src/data/*.json and public/img, public/docs. Run locally on macOS (sips + cwebp):
    python3 -I scripts/prepare.py
The output is committed, so the GitHub Actions build needs neither tool.
"""
import csv, hashlib, json, re, shutil, subprocess
from pathlib import Path

V3 = Path(__file__).resolve().parent.parent
P = V3.parent
REC = P / "reconstruction"
N = REC / "normalized"
SCANS = P / "src_extract" / "rr300_catalog"
OWNER_PHOTOS = P / "site" / "img" / "site"
MANUAL = P / "site" / "docs" / "rr300-re.pdf"  # byte-identical copy of the owner's «Руководство РР300 А4.pdf»
DATA = V3 / "src" / "data"
IMG = V3 / "public" / "img"

MODEL_SLUG = {"rr300": "rr-300", "rr238": "rr-238", "3d6": "3d6", "3d12": "3d12"}
CLAIMS = re.compile(r"официальн|гарант|сертифицир|надёжн|качествен|бесплатн", re.I)
BOILER = re.compile(r"^(Применение|Используется при|плановом техническом|замене изношенных)")
TYPES = [  # filter "Тип детали": first word of the catalog name -> group
    ("Шестерни", ("Шестерня",)), ("Валы", ("Вал", "Валик")), ("Подшипники", ("Подшипник", "Роликоподшипник")),
    ("Диски", ("Диск",)), ("Шайбы", ("Шайба",)), ("Кольца", ("Кольцо",)), ("Гайки, болты, винты", ("Гайка", "Болт", "Винт", "Шпилька")),
    ("Крышки и корпуса", ("Крышка", "Корпус")), ("Втулки и стаканы", ("Втулка", "Стакан")), ("Муфты и полумуфты", ("Муфта", "Полумуфта")),
    ("Насосы", ("Насос",)), ("Прокладки и уплотнения", ("Прокладка", "Манжета", "Уплотнение")), ("Пружины", ("Пружина",)),
    ("Комплекты и ремкомплекты", ("Ремкомплект", "Комплект", "Набор")),
]


def ru(s):
    """Site copy rule: no em dashes, non-breaking space between number and unit."""
    s = str(s or "").replace(" — ", ", ").replace("—", "-").replace("\u2011", "-").replace("−", "-").replace("‑", "-")
    return re.sub(r"(\d) (кг|мм|л\.с\.|л\. с\.|об/мин|кВт|л|МПа|°C|шт\.?)(?=[\s,.;)]|$)", "\\1\u00a0\\2", s).strip()


def dims(f):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(f)], capture_output=True, text=True).stdout
    w, h = re.findall(r"pixel\w+: (\d+)", out)
    return int(w), int(h)


def webp(src, folder, width, q=80):
    """Content-addressed WebP, never upscaled. Returns {src, w, h} relative to public/."""
    src = Path(src)
    w, h = dims(src)
    tw = min(width, w)
    name = f"{hashlib.sha256(src.read_bytes()).hexdigest()[:12]}-{tw}.webp"
    out = IMG / folder / name
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists():
        subprocess.run(["cwebp", "-quiet", "-q", str(q), "-resize", str(tw), "0", str(src), "-o", str(out)], check=True)
    return {"src": f"img/{folder}/{name}", "w": tw, "h": round(h * tw / w)}


def photo(src, folder, source, small=640, large=1400):
    return {"t": webp(src, folder, small), "f": webp(src, folder, large, 84), "source": source}


def clean_description(text, designation=""):
    """Keep the part-specific lines of the old store text; drop boilerplate, unconfirmed claims and the repeated part number."""
    out = []
    for line in ru(text).split("\n"):
        if designation and line.strip().startswith(designation):
            line = line.strip()[len(designation):].strip()
        line = re.sub(r"\s*,?\s*оригинальн\w*\s+запчаст\w*", ", запчасть", line.strip()).replace(" ,", ",")
        if line and not BOILER.match(line) and not CLAIMS.search(line):
            out.append(line)
    return out


def price(archive):
    """Rubles from the old store: revers-remont.ru first (the operator's own site), else revers-reduktor.ru. Demo: archive prices shown as is."""
    for src in ("revers-remont.ru", "revers-reduktor.ru"):
        for x in archive or []:
            if x["source"].startswith(src):
                n = x["value"] if isinstance(x["value"], (int, float)) else float(re.sub(r"[^\d.]", "", x["value"]) or 0)
                if n > 0:
                    return int(n)
    return None


def part_type(name):
    w = name.split()[0] if name else ""
    return next((g for g, words in TYPES if w in words), "Прочие детали")


LAT = str.maketrans("ABCEHKMOPTXY", "АВСЕНКМОРТХУ")
norm = lambda d: re.sub(r"\s+", "", str(d or "").upper().translate(LAT)).replace("СБ", "СБ")
TRANSCRIBED = V3 / "data-src" / "specs_transcribed.txt"


def transcribed():
    """Spec tables typed from the scans (data-src/specs_transcribed.txt): {figure: {variants, rows, footnotes, title}}."""
    out, cur = {}, None
    for line in TRANSCRIBED.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            fig, var = line[3:].split("|")
            cur = out[int(fig)] = {"variants": var.split(), "rows": [], "footnotes": {}, "title": None}
        elif cur is None or not line.strip() or line.startswith("#"):
            continue
        elif line.startswith("fn "):
            k, v = line[3:].split(": ", 1)
            cur["footnotes"][k] = v
        elif line.startswith("title: "):
            cur["title"] = line[7:]
        else:
            pos, des, fn, name, qty, mass, mat = line.split("|")
            q = [None if x == "-" else int(x) for x in qty.split()]
            assert len(q) == len(cur["variants"]), line
            cur["rows"].append({"pos": int(pos), "designation": des, "name": name, "qty": q, "mass": mass, "material": mat, "note": fn or None})
    return out


# Client-facing model specs: one value per characteristic. Rule and sources: results/v3_pamyatka.html.
SKIP_SPECS = {"Габариты (Д × Ш × В), мм"}  # same 781 × 650 × 799 for all four models: not trustworthy
KEY_SPECS = {  # four headline values per model, taken from the sources named in CONTENT_SOURCES.md
    "rr300": [("Мощность", "300 л.с."), ("Частота вращения", "1500 об/мин"), ("Передний ход", "1:2,04 / 1:2,95"), ("Масса", "430-460 кг")],
    "rr238": [("Мощность", "300 л.с."), ("Частота вращения", "1500 об/мин"), ("Передний ход", "1:2,04"), ("Масса", "450 кг")],
    "3d6": [("Мощность", "150 л.с."), ("Частота вращения", "1500 об/мин"), ("Передний ход", "1:3,07 / 1:2,02"), ("Масса", "470 кг")],
    "3d12": [("Мощность", "300 л.с."), ("Частота вращения", "1500 об/мин"), ("Передний ход", "1:2,95 / 1:2,04"), ("Масса", "470 кг")],
}


def client_specs(m):
    out = []
    manual = lambda s: next((v["value"] for v in s["values"] if v["source"].startswith("Руководство")), None)
    for s in m["specs"]:
        if s["label"] in SKIP_SPECS:
            continue
        val = ru(s["values"][0]["value"])
        if m["id"] == "rr300":
            if s["label"] == "Полная мощность":
                val = "300 л.с. (220 кВт); исполнения -040 и -041: 150 л.с."
            elif s["label"].startswith("Передаточное отношение"):
                key = "fwd" if "передний" in s["label"] else "rev"
                val = " / ".join(dict.fromkeys(v[key] for v in m["variants"])) + " (по исполнениям)"
            elif manual(s) and s["label"] in ("Частота вращения ведущего вала", "Масса, кг", "Объём масла в гидросистеме, л"):
                val = ru(manual(s))
        val = val.replace("л. с", "л.с.").replace("л.с..", "л.с.")
        if s["label"] == "Масса, кг":
            val = re.sub(r"\b(\d+) \(", "\\1\u00a0кг (", val) + ("\u00a0кг" if re.fullmatch(r"\d+", val) else "")
        out.append({"label": s["label"].replace(", кг", "").replace(", мм", "").replace(", л", ""), "value": val})
    return out


def main():
    models = json.loads((N / "models.json").read_text(encoding="utf-8"))
    asm = json.loads((N / "assemblies.json").read_text(encoding="utf-8"))
    parts = json.loads((N / "parts.json").read_text(encoding="utf-8"))
    by_key = {p["key"]: p for p in parts}
    DATA.mkdir(parents=True, exist_ok=True)

    out_parts = []
    for p in parts:
        photos = sorted(p["photos"], key=lambda x: -x["bytes"])
        if len(photos) > 1:  # tiny Tilda previews duplicate a larger shot of the same part
            photos = [x for x in photos if x["bytes"] > 4000]
        out_parts.append({
            "id": p["id"], "designation": p["designation"], "name": ru(p["name"]),
            "names": [{"value": ru(n["value"]), "source": n["source"]} for n in p["names"] if n["value"]],
            "spellings": sorted({s["value"] for s in p["spellings"]} | {p["designation"], p["key"]}),
            "models": p["models"], "type": part_type(p["name"]),
            "assemblies": [{"figure": a["figure"], "pos": a["pos"], "status": a["status"]} for a in p["assemblies"]],
            "description": clean_description(p["description"], p["designation"]) if p["description"] else [],
            "photos": [photo(REC / x["file"], "p", x["source"]) for x in photos],
            "confidence": p["confidence"], "sources": p["sources"], "oldUrl": p["old_url"], "price": price(p["price_archive"]),
        })

    conflicts = [r for r in csv.DictReader((REC / "manifests" / "conflicts.csv").open(encoding="utf-8")) if r["type"] == "model_spec"]
    out_models = []
    for m in models:
        desc = [ru(c) for c in m["description_old_site"] if not CLAIMS.search(c) and not c.startswith("#")
                and m["name"].replace("-", "") in c.replace("‑", "").replace("-", "")][:3]
        out_models.append({
            "id": m["id"], "slug": MODEL_SLUG[m["id"]], "name": m["name"], "designation": m["designation"], "kind": m["kind"],
            "specs": [{"label": s["label"], "values": [{"value": ru(v["value"]), "source": v["source"]} for v in s["values"]]} for s in m["specs"]],
            "variants": m["variants"], "variantsSource": m["variants_source"], "description": desc,
            "photos": [photo(REC / x["file"], "m", x["source"]) for x in sorted(m["photos"], key=lambda x: -x["bytes"])],
            "oldUrl": m["old_card"], "price": price(m["price_archive"]), "specsClient": client_specs(m), "keySpecs": [{"label": k, "value": v} for k, v in KEY_SPECS[m["id"]]],
            "conflicts": [{"subject": ru(c["subject"]), "values": ru(c["values"]), "resolution": ru(c["resolution"])}
                          for c in conflicts if m["name"] in c["subject"]],
        })

    model_price = {norm(m["designation"]): m["price"] for m in out_models}
    for p in out_parts:  # the catalog lists the whole gear as a part too: same price as the model
        p["price"] = p["price"] or model_price.get(norm(p["designation"]))
    # designation (any spelling) -> part id, for linking table rows to catalog pages
    by_des = {}
    for p in parts:
        for d in {p["designation"], p["key"]} | {x["value"] for x in p["spellings"]}:
            by_des.setdefault(norm(d), p["id"])
    typed = transcribed()
    out_asm = []
    for a in asm:
        n = a["figure"]
        t = typed.get(n)
        rows = t["rows"] if t else [{"pos": r["pos"], "designation": r["designation"], "name": r["name"], "qty": r["qty"], "mass": r["mass"],
                                     "material": r.get("material"), "note": r["note"]} for r in a["rows"]]
        assert t or a["status"] == "verified_scan", f"fig {n}: no checked table"
        out_asm.append({
            "id": a["id"], "figure": n, "slug": f"ris-{n:02d}", "title": ru(t["title"] if t and t["title"] else a["title"]), "designation": a["designation"],
            "variants": t["variants"] if t else a["variants"],
            "footnotes": {k: ru(v) for k, v in (t["footnotes"] if t else (a["footnotes"] or {})).items()},
            "catalogPages": a["catalog_pages"],
            "drawing": photo(SCANS / a["scan_drawing"], "scan", "каталог РР-300 (скан владельца)", 900, 2000),
            "spec": photo(SCANS / a["scan_spec"], "scan", "каталог РР-300 (скан владельца)", 900, 2000),
            "rows": [{**r, "name": ru(r["name"]), "material": None if r.get("material") in (None, "-") else r["material"],
                      "part": by_des.get(norm(r["designation"])) if r["designation"] != "БЧ" else None} for r in rows],
        })
    # part -> node links come only from the checked tables
    links = {}
    for a in out_asm:
        for r in a["rows"]:
            if r["part"]:
                links.setdefault(r["part"], []).append({"figure": a["figure"], "pos": r["pos"]})
    for p in out_parts:
        p["assemblies"] = links.get(p["id"], [])
    # OCR-only designations that no checked table confirms may carry footnote digits glued on. Published as read
    # (Dmitry, 2026-10-28: every catalog part stays on the site); listed for checking against the scan.
    dropped = [p for p in out_parts if p["confidence"].startswith("OCR") and not p["assemblies"]]
    (DATA / "dropped-parts.json").write_text(json.dumps([{"designation": p["designation"], "name": p["name"]} for p in dropped], ensure_ascii=False, indent=1), encoding="utf-8")

    scans = sorted(SCANS.glob("*.jpg"), key=lambda f: int(re.search(r"(\d+)", f.stem).group(1)))
    out_scans = [{"n": int(re.search(r"(\d+)", f.stem).group(1)), "title": re.sub(r"\s*\d+$", "", f.stem), **photo(f, "scan", "каталог РР-300", 420, 2000)} for f in scans]

    site = {k: photo(OWNER_PHOTOS / f"{k}.jpg", "site", "фото владельца", 900, 1600) for k in ("hero-rr300-pair", "rr300-flange", "rr300-side", "parts", "rko-06483")}

    (V3 / "public" / "docs").mkdir(parents=True, exist_ok=True)
    shutil.copy2(MANUAL, V3 / "public" / "docs" / "rr300-rukovodstvo.pdf")

    for name, obj in [("parts", out_parts), ("models", out_models), ("assemblies", out_asm), ("scans", out_scans), ("site-photos", site)]:
        (DATA / f"{name}.json").write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"parts {len(out_parts)}, with photo {sum(1 for p in out_parts if p['photos'])}, models {len(out_models)}, "
          f"assemblies {len(out_asm)}, scans {len(out_scans)}, webp files {len(list(IMG.rglob('*.webp')))}")
    # self-check: the claim filter really removed unconfirmed claims
    assert not any(CLAIMS.search(" ".join(p["description"])) for p in out_parts)
    assert all(p["id"] and p["designation"] for p in out_parts)


if __name__ == "__main__":
    main()
