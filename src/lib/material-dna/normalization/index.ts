import type { MaterialDNA, MaterialRecord } from "@/types/domain";
import { extractMaterialDNA } from "../extraction";

// ---------------------------------------------------------------------------
// Normalization tiers. Deterministic, keeps original source intact.
// ---------------------------------------------------------------------------

const UNITS: Record<string, string> = {
  mm: "mm",
  "millimeter": "mm",
  "millimetre": "mm",
  m: "m",
  "meter": "m",
  "metre": "m",
  cm: "cm",
  "centimeter": "cm",
  inch: "in",
  inches: "in",
  '"': "in",
  kg: "kg",
  g: "g",
  gm: "g",
  litre: "L",
  liters: "L",
  l: "L",
};

const TOKEN_ALIASES: Record<string, string> = {
  hexagon: "hexagon",
  dia: "diameter",
  diameter: "diameter",
  x: "×",
  "*": "×",
  "@": "at",
  grade: "grade",
  escr: "screws",
  sqmm: "sq mm",
  "sq.mm": "sq mm",
  "sqm": "sq m",
  nos: "numbers",
};

const SS_GRADE_ALIASES: Record<string, string> = {
  ss304: "304 stainless steel",
  "304ss": "304 stainless steel",
  "ss 304": "304 stainless steel",
  ss304l: "304l stainless steel",
  "304lss": "304l stainless steel",
  ss316: "316 stainless steel",
  "316ss": "316 stainless steel",
  ss316l: "316l stainless steel",
  "316lss": "316l stainless steel",
  stainless316l: "316l stainless steel",
  stainless304: "304 stainless steel",
  stainless316: "316 stainless steel",
};

const MATERIAL_ALIASES: Record<string, string> = {
  ms: "mild steel",
  "mild steel": "mild steel",
  msx: "mild steel",
  carbonsteel: "carbon steel",
  "carbon steel": "carbon steel",
  csteel: "carbon steel",
  ssteel: "stainless steel",
  ss: "stainless steel",
  "steel": "steel",
  "ss 304": "304 stainless steel",
  al: "aluminium",
  aluminised: "aluminium",
  cu: "copper",
  pas: "brass",
};

export function normalizeTerm(term: string): string {
  const t = term.trim();
  const low = t.toLowerCase();
  const compact = low.replace(/\s+/g, "");

  if (SS_GRADE_ALIASES[compact]) return SS_GRADE_ALIASES[compact];
  if (MATERIAL_ALIASES[compact]) return MATERIAL_ALIASES[compact];

  if (UNITS[low]) return UNITS[low];
  if (TOKEN_ALIASES[low]) return TOKEN_ALIASES[low];

  return t;
}

export function normalizeDescription(raw: string): string {
  let out = raw.trim();

  // Collapse whitespace
  out = out.replace(/\s+/g, " ");

  // Thread + dimension spacing: M12x60 -> M12 × 60 mm
  out = out.replace(
    /\b(M\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\b/g,
    "$1 × $2 mm"
  );

  // Generic mm dimension spacing
  out = out.replace(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/gi, "$1 × $2");

  // Clean mm proximity: 60mm -> 60 mm
  out = out.replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, "$1 mm");

  // Clean sq mm: 2.5sqmm / 2.5 sqmm -> 2.5 sq mm
  out = out.replace(/(\d+(?:\.\d+)?)\s*sq\s*mm\b/gi, "$1 sq mm");
  out = out.replace(/(\d+(?:\.\d+)?)\s*sqmm\b/gi, "$1 sq mm");

  // Replace common single-token aliases using word boundaries
  for (const [alias, replacement] of Object.entries(TOKEN_ALIASES)) {
    if (alias.includes(" ") || alias === "×" || alias === "*") continue;
    out = out.replace(new RegExp(`\\b${alias}\\b`, "gi"), replacement);
    void replacement;
  }

  // Multi-word aliases (processed explicitly to control casing)
  out = out.replace(/\bZN\s+PLATED\b/gi, "Zinc Plated");
  out = out.replace(/\bZINC\s+PLATED\b/gi, "Zinc Plated");
  out = out.replace(/\bBLUE\s+ZINC\b/gi, "Blue Zinc Plated");

  // Compact SS aliases anywhere (e.g., SS304, SS316L, 304SS), longest first
  const ssAliases = Object.keys(SS_GRADE_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of ssAliases) {
    const re = new RegExp(`\\b${alias}\\b`, "gi");
    if (re.test(out)) {
      out = out.replace(re, SS_GRADE_ALIASES[alias]);
    }
  }

  // "MS" as a standalone token -> Mild Steel, but avoid matching M12
  out = out.replace(/\bMS\b(?!\d)/g, "Mild Steel");

  // "SS" standalone -> Stainless Steel
  out = out.replace(/\bSS\b(?!\d)/g, "Stainless Steel");

  // ZP / ZN standalones (with case)
  out = out.replace(/\bZP\b/gi, "Zinc Plated");
  out = out.replace(/\bZNP\b/gi, "Zinc Plated");
  out = out.replace(/\bZn\b/gi, "Zinc Plated");

  // DIN 931 style spacing
  out = out.replace(/\bDIN\s*931\b/gi, "DIN 931");
  out = out.replace(/\bDIN\s*125\b/gi, "DIN 125");

  return out.replace(/\s+/g, " ").trim();
}

export function generateCanonicalDescription(dna: MaterialDNA): string {
  const parts: string[] = [];
  const push = (v: string | null | undefined) => {
    if (v && v.trim()) parts.push(String(v).trim());
  };
  push(dna.materialType.value);
  push(dna.material.value);
  const dims = dna.dimensions.value ?? [];
  if (dims.length) parts.push(dims.join(", "));
  push(dna.grade.value);
  push(dna.coating.value);
  const stds = dna.standard.value ?? [];
  if (stds.length) parts.push(stds.join(" + "));
  push(dna.classPressure.value);
  push(dna.schedule.value);
  push(dna.thread.value);
  const elec = dna.electrical.value ?? [];
  if (elec.length) parts.push(elec.join(", "));
  return parts.join(" | ");
}

export function normalizeRecord(record: MaterialRecord): MaterialRecord {
  const normalizedDescription = normalizeDescription(record.rawDescription);
  const dna = extractMaterialDNA(normalizedDescription);
  return {
    ...record,
    normalizedDescription,
    dna,
  };
}

// ---------------------------------------------------------------------------
// Normalization helpers used by scoring
// ---------------------------------------------------------------------------

export function canonicalGrade(raw: string): string {
  const compact = raw.toLowerCase().replace(/[\s-]/g, "");
  if (SS_GRADE_ALIASES[compact]) return SS_GRADE_ALIASES[compact];
  return raw.trim().toUpperCase();
}

export function fuzzTokens(text: string): string[] {
  return normalizeDescription(text)
    .toLowerCase()
    .replace(/[^a-z0-9×°+\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}