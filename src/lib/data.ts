// Typed access to the catalog exported by scripts/prepare.py. UI code never reads JSON directly.
import partsJson from "../data/parts.json";
import modelsJson from "../data/models.json";
import asmJson from "../data/assemblies.json";
import scansJson from "../data/scans.json";
import sitePhotosJson from "../data/site-photos.json";

export interface Img { src: string; w: number; h: number }
export interface Photo { t: Img; f: Img; source: string }
export interface Sourced { value: string; source: string }
export interface Part {
  id: string; designation: string; name: string; names: Sourced[]; spellings: string[];
  models: string[]; type: string; description: string[]; photos: Photo[];
  assemblies: { figure: number; pos: number | null }[];
  confidence: string; sources: string[]; oldUrl: string | null;
}
export interface Variant { code: string; rot: string; hp: number; fwd: string; rev: string; fingers: number; full: string }
export interface Model {
  id: string; slug: string; name: string; designation: string; kind: string;
  specs: { label: string; values: Sourced[] }[]; variants: Variant[]; variantsSource: string;
  description: string[]; photos: Photo[]; oldUrl: string | null;
  conflicts: { subject: string; values: string; resolution: string }[];
  specsClient: { label: string; value: string }[];
  keySpecs: { label: string; value: string }[];
}
export interface Row {
  pos: number | null; designation: string; name: string; qty: (number | null)[] | null;
  mass: string | null; material: string | null; note: string | null; part: string | null;
}
export interface Assembly {
  id: string; figure: number; slug: string; title: string; designation: string; variants: string[];
  footnotes: Record<string, string>; catalogPages: number[] | null;
  drawing: Photo; spec: Photo; rows: Row[];
}
export interface Scan extends Photo { n: number; title: string }

export const parts = partsJson as Part[];
export const models = modelsJson as Model[];
export const assemblies = asmJson as Assembly[];
export const scans = scansJson as Scan[];
export const sitePhotos = sitePhotosJson as Record<string, Photo>;

export const modelById = new Map(models.map((m) => [m.id, m]));
export const partById = new Map(parts.map((p) => [p.id, p]));
export const asmByFigure = new Map(assemblies.map((a) => [a.figure, a]));
export const modelNames = (ids: string[]) => ids.map((i) => modelById.get(i)?.name ?? i);

// Default catalog order: parts with a photo first, then model (as on the old site), then designation.
const MODEL_ORDER = ["rr300", "3d6", "3d12", "rr238"];
export const sortedParts = [...parts].sort(
  (a, b) => Number(!a.photos.length) - Number(!b.photos.length) || MODEL_ORDER.indexOf(a.models[0]) - MODEL_ORDER.indexOf(b.models[0]) ||
    a.designation.localeCompare(b.designation, "ru", { numeric: true }),
);
export const partsOf = (modelId: string) => sortedParts.filter((p) => p.models.includes(modelId));
export const modelsInOrder = MODEL_ORDER.map((id) => modelById.get(id)!);


// Documents with a real file in public/. Size is measured at build time in the pages that list them.
export const manual = {
  href: "docs/rr300-rukovodstvo.pdf",
  title: "Руководство по эксплуатации реверс-редукторов РР-300 и РР-238",
  models: ["rr300", "rr238"],
  pages: 24,
  source: "файл владельца «Руководство РР300 А4.pdf»; тот же текст был опубликован на revers-remont.ru страницей «Руководство по эксплуатации»",
};
