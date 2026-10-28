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


def clean_description(text):
    """Keep the part-specific lines of the old store text; drop boilerplate and unconfirmed claims."""
    out = []
    for line in ru(text).split("\n"):
        line = re.sub(r"\s*,?\s*оригинальн\w*\s+запчаст\w*", ", запчасть", line.strip()).replace(" ,", ",")
        if line and not BOILER.match(line) and not CLAIMS.search(line):
            out.append(line)
    return out


def part_type(name):
    w = name.split()[0] if name else ""
    return next((g for g, words in TYPES if w in words), "Прочие детали")


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
            "description": clean_description(p["description"]) if p["description"] else [],
            "photos": [photo(REC / x["file"], "p", x["source"]) for x in photos],
            "confidence": p["confidence"], "sources": p["sources"], "oldUrl": p["old_url"],
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
            "oldUrl": m["old_card"],
            "conflicts": [{"subject": ru(c["subject"]), "values": ru(c["values"]), "resolution": ru(c["resolution"])}
                          for c in conflicts if m["name"] in c["subject"]],
        })

    out_asm = []
    for a in asm:
        n = a["figure"]
        out_asm.append({
            "id": a["id"], "figure": n, "slug": f"ris-{n:02d}", "title": ru(a["title"]), "designation": a["designation"],
            "variants": a["variants"], "footnotes": {k: ru(v) for k, v in (a["footnotes"] or {}).items()},
            "verified": a["status"] == "verified_scan", "verifiedNote": a.get("verified_note"), "catalogPages": a["catalog_pages"],
            "drawing": photo(SCANS / a["scan_drawing"], "scan", "каталог РР-300 (скан владельца)", 900, 2000),
            "spec": photo(SCANS / a["scan_spec"], "scan", "каталог РР-300 (скан владельца)", 900, 2000),
            "rows": [{"pos": r["pos"], "designation": r["designation"], "name": ru(r["name"]), "qty": r["qty"], "mass": r["mass"],
                      "note": r["note"], "check": r["status"] == "ocr_needs_check",
                      "part": by_key[r["part_key"]]["id"] if r["part_key"] in by_key else None} for r in a["rows"]],
        })

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
