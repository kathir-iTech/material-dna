import type {
  Attribute,
  AttributeEvidence,
  MaterialDNA,
} from "@/types/domain";
import { ATTRIBUTE_META } from "../config";

// ---------------------------------------------------------------------------
// Vocabulary / controlled dictionaries
// ---------------------------------------------------------------------------

const MATERIAL_TYPES = [
  "bolt",
  "nut",
  "washer",
  "pipe",
  "valve",
  "bearing",
  "cable",
  "flange",
  "plate",
  "gasket",
  "elbow",
  "pump",
  "coupling",
  "hose",
  "gland",
  "sensor",
  "cylinder",
  "fuse",
  "switch",
  "motor",
  "stabilizer",
  "chiller",
  "tape",
  "sheet",
  "rod",
  "bar",
  "angle",
  "channel",
  "conduit",
  "gauge",
  "wire",
  "rope",
  "fastener",
  "screw",
  "spring",
  "goggle",
  "shoe",
  "glove",
  "tile",
  "capacitor",
  "diode",
  "relay",
  "contactor",
  "transformer",
  "filter",
  "tray",
  "mesh",
  "meter",
  "fitting",
  "grease",
  "oil",
  "paint",
  "seal",
  "o-ring",
  "gasket",
  "bushing",
  "bush",
  "roller",
  "electrode",
  "gear",
  "sprocket",
  "belt",
  "ring",
  "spacer",
  "clamp",
  "hanger",
  "support",
  "anchor",
  "stud",
  "pin",
  "key",
  "lamp",
  "light",
  "panel",
  "breaker",
  "starter",
  "drive",
  "thermocouple",
  "cooler",
  "exchanger",
  "separator",
  "vessel",
  "tank",
];

// Detect base material family references
const MATERIAL_FAMILIES: Record<string, string> = {
  "carbon steel": "Carbon Steel",
  "mild steel": "Mild Steel",
  ms: "Mild Steel",
  stainless: "Stainless Steel",
  "stainless steel": "Stainless Steel",
  ss: "Stainless Steel",
  aluminium: "Aluminium",
  aluminum: "Aluminium",
  copper: "Copper",
  brass: "Brass",
  bronze: "Bronze",
  nickel: "Nickel",
  titanium: "Titanium",
  iron: "Iron",
  galvanized: "Galvanized",
  galvanised: "Galvanised",
  gi: "Galvanised Iron",
  cast: "Cast",
  pvc: "PVC",
  ptfe: "PTFE",
  teflon: "PTFE",
  nylon: "Nylon",
  rubber: "Rubber",
  nbr: "NBR",
  epdm: "EPDM",
  neoprene: "Neoprene",
  polypropylene: "Polypropylene",
  polyurethane: "Polyurethane",
  fiberglass: "Fiberglass",
  frp: "FRP",
  ceramic: "Ceramic",
  vitrified: "Vitrified",
  carbide: "Carbide",
  silicone: "Silicone",
  glass: "Glass",
  epoxy: "Epoxy",
  armoured: "Armoured",
  armored: "Armored",
  lead: "Lead",
  zinc: "Zinc",
  tool: "Tool Steel",
  hdpe: "HDPE",
  lldpe: "LLDPE",
};

const GRADE_STEEL: Record<string, string> = {
  "8.8": "8.8",
  "10.9": "10.9",
  "12.9": "12.9",
  "4.6": "4.6",
  "5.8": "5.8",
  "9.8": "9.8",
  "304": "304",
  "304l": "304L",
  "316": "316",
  "316l": "316L",
  "316ti": "316Ti",
  "321": "321",
  "410": "410",
  "430": "430",
  "201": "201",
  "202": "202",
  // Cross-system designations recognized so the grade-equivalence table in
  // lib/grade-equivalence can see them (see that module for sources).
  // JIS G3101 structural grades (SS400, SM490) and JIS G4404 tool steel
  // (SKD11):
  ss400: "SS400",
  sm490: "SM490",
  skd11: "SKD11",
  // EN 10025-2 / EN 10088-2 designation-system forms:
  s235: "S235",
  s235jr: "S235JR",
  s275: "S275",
  s275jr: "S275JR",
  s355: "S355",
  s355jr: "S355JR",
  // DIN 17100 legacy structural designations (hyphenated tokens stay whole):
  "st37-2": "St37-2",
  "st52-3": "St52-3",
  // GB/T 700 / GB/T 1591:
  q235: "Q235",
  q345: "Q345",
  // Old EN 10025 pre-2004 designations:
  fe360: "Fe360",
  fe510: "Fe510",
  // EN material numbers (Werkstoff numbers) for stainless/tool grades:
  "1.4301": "1.4301",
  "1.4307": "1.4307",
  "1.4401": "1.4401",
  "1.4404": "1.4404",
  "1.2379": "1.2379",
  "1.2080": "1.2080",
  // EN chemical designations (same materials as the numbers above):
  "x5crni18-10": "X5CrNi18-10",
  "x5crnimo17-12-2": "X5CrNiMo17-12-2",
  "x155crvmo12-1": "X155CrVMo12-1",
  "x210cr12": "X210Cr12",
  // UNS numbers (SAE) for austenitic stainless grades:
  s30400: "S30400",
  s30403: "S30403",
  s31600: "S31600",
  s31603: "S31603",
};

// Normalized forms of materials referencing stainless grade
const SS_ALIASES: Record<string, string> = {
  ss304: "304",
  "304ss": "304",
  "ss 304": "304",
  ss304l: "304L",
  "304l ss": "304L",
  "ss 304l": "304L",
  ss316: "316",
  "316ss": "316",
  "ss 316": "316",
  ss316l: "316L",
  "316l ss": "316L",
  "ss 316l": "316L",
  "316l": "316L",
  stainless316l: "316L",
  // JIS G4304 forms (kept distinct from AISI/ASTM labels so the
  // grade-equivalence table surfaces the cross-standard relationship as a
  // reviewable WARNING instead of silently collapsing it).
  sus304: "SUS304",
  "sus 304": "SUS304",
  sus304l: "SUS304L",
  "sus 304l": "SUS304L",
  sus316: "SUS316",
  "sus 316": "SUS316",
  sus316l: "SUS316L",
  "sus 316l": "SUS316L",
};

const COATINGS: Record<string, string> = {
  zp: "Zinc Plated",
  zn: "Zinc Plated",
  "zinc plated": "Zinc Plated",
  "zinc coated": "Zinc Coated",
  "zinced": "Zinc Coated",
  "galvanized": "Galvanized",
  "galvanised": "Galvanised",
  "hdg": "Hot-Dip Galvanized",
  "hot dipped": "Hot-Dip Galvanized",
  "hot dip": "Hot-Dip Galvanized",
  "" : "",
};

// IS 2062:2011 (BIS) clause 5: nine grades E250, E275, E300, E350, E410,
// E450, E550, E600, E650. Sub-qualities A, BR, B0, C for E250-E410 and
// A, BR for E450-E650 (A: no impact test; BR: optional room-temp impact;
// B0: mandatory 0 C impact; C: mandatory -20 C impact). Compact market forms
// "E250B" / "E250BO" denote sub-quality B0 and map to the same label.
const GRADE_STRUCTURAL: Record<string, string> = {
  e250: "E250",
  e250a: "E250A",
  e250br: "E250BR",
  e250b: "E250B0",
  e250b0: "E250B0",
  e250bo: "E250B0",
  e250c: "E250C",
  e275: "E275",
  e275a: "E275A",
  e275br: "E275BR",
  e275b: "E275B0",
  e275b0: "E275B0",
  e275c: "E275C",
  e300: "E300",
  e300a: "E300A",
  e300br: "E300BR",
  e300b: "E300B0",
  e300b0: "E300B0",
  e300c: "E300C",
  e350: "E350",
  e350a: "E350A",
  e350br: "E350BR",
  e350b: "E350B0",
  e350b0: "E350B0",
  e350c: "E350C",
  e410: "E410",
  e410a: "E410A",
  e410br: "E410BR",
  e410b: "E410B0",
  e410b0: "E410B0",
  e410c: "E410C",
  e450: "E450",
  e450a: "E450A",
  e450br: "E450BR",
  e550: "E550",
  e550a: "E550A",
  e550br: "E550BR",
  e600: "E600",
  e600a: "E600A",
  e600br: "E600BR",
  e650: "E650",
  e650a: "E650A",
  e650br: "E650BR",
  e7018: "E7018",
  e6013: "E6013",
  a36: "A36",
  d2: "D2",
  d3: "D3",
};

const STANDARDS: Record<string, string> = {
  "din 931": "DIN 931",
  "din 933": "DIN 933",
  "din 934": "DIN 934",
  "din 125": "DIN 125",
  "din 7980": "DIN 7980",
  "asti": "", // guard to avoid matching "ASTM" wrongly
  "astm a36": "ASTM A36",
  "astm a106": "ASTM A106",
  "astm a105": "ASTM A105",
  "astm b16.5": "ASME B16.5",
  "astm a182": "ASTM A182",
  "astm a312": "ASTM A312",
  "asme b16.5": "ASME B16.5",
  "asme b16.34": "ASME B16.34",
  "ansi b16.5": "ASME B16.5",
  "ansi": "ANSI",
  "iso 4014": "ISO 4014",
  "iso 4017": "ISO 4017",
  "iso 4762": "ISO 4762",
  "iso 4032": "ISO 4032",
  "is 2062": "IS 2062",
  "is 1239": "IS 1239",
  "is 1239 (part 3)": "IS 1239 Part 3",
  "is 3589": "IS 3589",
  "is 1161": "IS 1161",
  "bs 1387": "BS 1387",
  "en 10255": "EN 10255",
  "en 10025": "EN 10025",
  "api 6d": "API 6D",
  "api 598": "API 598",
  "api": "API",
  "jis g3101": "JIS G3101",
  "jis g3452": "JIS G3452",
  "bs en": "BS EN",
  "iec": "IEC",
  "vde": "VDE",
};

const CLASSES: Record<string, string> = {
  "class 150": "Class 150",
  "class 300": "Class 300",
  "class 600": "Class 600",
  "class 900": "Class 900",
  "class 1500": "Class 1500",
  "class 2500": "Class 2500",
  "cl 150": "Class 150",
  "cl 300": "Class 300",
  "150#": "Class 150",
  "300#": "Class 300",
  "600#": "Class 600",
  "900#": "Class 900",
  "1500#": "Class 1500",
  // IS 1239 pipe wall-thickness classes (Class A / B / C) — distinct class
  // means a different pipe, so it must reach the pressure-class constraint.
  "class a": "Class A",
  "class b": "Class B",
  "class c": "Class C",
  pn10: "PN10",
  pn16: "PN16",
  pn25: "PN25",
  pn40: "PN40",
};

const SCHEDULES: Record<string, string> = {
  "sch 40": "SCH 40",
  "sch 80": "SCH 80",
  "sch 160": "SCH 160",
  "sch xx": "SCH XX",
  "sch xxs": "SCH XXS",
  "sch 10s": "SCH 10S",
  "sch 40s": "SCH 40S",
  "schedule 40": "SCH 40",
  "schedule 80": "SCH 80",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a numeric quantity that may carry a unit, to a canonical token. */
function extractQuantityTokens(desc: string): string[] {
  // Matches things like 2.5 SQ MM, 4 SQMM, 230 V, 415 V, 10 A, 3 CORE, 50 W, 4000 K
  const q = /(?<![A-Z0-9])(\d+(?:\.\d+)?)\s*(SQ\s?MM|sq\s?mm|V\b|A\b|W\b|KVAR|KVA\b|HP\b|TR\b|CORE\b|Cores\b)/g;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = q.exec(desc)) !== null) {
    const unit = m[2].toLowerCase().replace(/\s+/g, "");
    tokens.push(`${m[1]} ${unit}`);
  }
  return tokens;
}

function extractDimensions(desc: string): Attribute<string[]> {
  const spans: string[] = [];
  const normalized: string[] = [];
  // Character ranges already claimed by compound captures (thread / x-mm),
  // so a plain "50 mm" inside "M10 x 50mm" is not recorded a second time.
  const claimed: [number, number][] = [];

  // Metric thread sizes like M12 X 60, M12x60, M8 x 30
  const threadRe =
    /(M\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)(?:\s*mm)?(?:[×xX*]\s*(\d+(?:\.\d+)?))?/g;
  let m: RegExpExecArray | null;
  while ((m = threadRe.exec(desc)) !== null) {
    const span = m[0];
    const dia = m[1];
    const len = m[2];
    const extra = m[3];
    const dim = extra ? `${dia} × ${len} × ${extra} mm` : `${dia} × ${len} mm`;
    spans.push(span);
    claimed.push([m.index, m.index + span.length]);
    normalized.push(dim);
  }

  // Nominal pipe designations: "DN 100" / "DN100" (ISO 6708-1) and
  // "NPS 4" / "NPS 1/2" (ASME inch nominal). Claimed before the mm/inch
  // loops so "DN 100 mm" or "NPS 4 inch" does not double-capture; emitted
  // as "DN n" / "NPS x" tokens that lib/units parses back through the
  // NPS/DN equivalence table.
  const dnRe = /\bDN\s*(\d+)(?:\s*mm)?\b/g;
  while ((m = dnRe.exec(desc)) !== null) {
    spans.push(m[0]);
    claimed.push([m.index, m.index + m[0].length]);
    normalized.push(`DN ${m[1]}`);
  }

  const npsRe = /\bNPS\s*([0-9]+(?:\.[0-9]+)?(?:\s?\/\s?[0-9]+)?)\b(?:\s*(?:inch|inches|"))?/g;
  while ((m = npsRe.exec(desc)) !== null) {
    spans.push(m[0]);
    claimed.push([m.index, m.index + m[0].length]);
    normalized.push(`NPS ${m[1].replace(/\s+/g, "")}`);
  }

  // mm dimensions like 100 x 50 x 5 mm, 50 X 50 X 3, 600x600
  // Lookbehind avoids matching the numeric part of "M12 × 60".
  const mmRe =
    /(?<![A-Z0-9×])(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)(?:\s*[×xX]\s*(\d+(?:\.\d+)?))?(?:\s*mm)?/g;
  while ((m = mmRe.exec(desc)) !== null) {
    const span = m[0];
    if (/M\d/.test(span)) continue; // already captured by thread regex
    const a = m[1];
    const b = m[2];
    const c = m[3];
    const dim = c ? `${a} × ${b} × ${c} mm` : `${a} × ${b} mm`;
    spans.push(span);
    claimed.push([m.index, m.index + span.length]);
    normalized.push(dim);
  }

  // Single length + mm like "cable tray 300mm" (skips thread components)
  const singleMmRe = /(?<![A-Z0-9])(\d+(?:\.\d+)?)\s*mm/g;
  while ((m = singleMmRe.exec(desc)) !== null) {
    // Skip dimensions that are part of a compound capture (e.g. "M10 x 50mm"
    // already contributes 50 mm via the thread token above).
    if (claimed.some(([s, e]) => m!.index >= s && m!.index + m![0].length <= e)) continue;
    if (desc.slice(Math.max(0, m.index - 2), m.index).includes("×")) continue;
    spans.push(m[0]);
    normalized.push(`${m[1]} mm`);
  }

  // Inches like 1/2 inch, 2 inch, 3 inch, 3/4 inch
  const inchRe = /(?<![A-Z0-9])(\d+(?:\s?[/-]\s?\d+)?|\d+(?:\.\d+)?)\s*(inch|inches|")/gi;
  while ((m = inchRe.exec(desc)) !== null) {
    const span = m[0];
    // Skip sizes already claimed (e.g. "NPS 4 inch" claims the whole span).
    if (claimed.some(([s, e]) => m!.index >= s && m!.index + m![0].length <= e)) continue;
    const inches = parseFraction(m[1]);
    if (inches === null) continue;
    const mm = inches * 25.4;
    spans.push(span);
    normalized.push(`${m[1]}″ (${mm.toFixed(1)} mm)`);
  }

  // Meter lengths like 6m / 20m
  const meterRe = /(?<![A-Z0-9×])(\d+(?:\.\d+)?)\s*m\b/g;
  while ((m = meterRe.exec(desc)) !== null) {
    const span = m[0];
    spans.push(span);
    normalized.push(`${m[1]} m`);
  }

  const unique = Array.from(new Set(normalized));
  return makeAttribute("dimensions", unique, spans[0] ?? desc, spans[0] ?? "", unique.length > 0 || spans.length > 0 ? 0.9 : 0);
}

function parseFraction(s: string): number | null {
  s = s.replace(/\s+/g, "");
  if (s.includes("/")) {
    const [num, den] = s.split("/").map((x) => parseFloat(x));
    if (isNaN(num) || isNaN(den) || den === 0) return null;
    return num / den;
  }
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

function makeAttribute<T>(
  key: string,
  value: T,
  sourceText: string,
  span: string,
  confidence: number
): Attribute<Exclude<T, null>> {
  const evidence: AttributeEvidence | null =
    span && confidence > 0
      ? {
          sourceText,
          span,
          normalizedValue: Array.isArray(value) ? value.join(", ") : String(value ?? ""),
          confidence,
          extractor: "Schema-aware prototype parser",
        }
      : null;
  return {
    key,
    label: ATTRIBUTE_META[key]?.label ?? key,
    value: value as Exclude<T, null>,
    confidence,
    evidence,
  };
}

function clean(t: string): string {
  return t.replace(/[^\w.%-]/g, "").toLowerCase();
}

function asToken(desc: string): { span: string; value: string; low: string }[] {
  return desc
    .split(/\s+/)
    .filter(Boolean)
    .map((span) => ({ span, value: clean(span), low: span.toLowerCase() }));
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

export function extractMaterialDNA(description: string): MaterialDNA {
  const src = description.trim();
  const raw = src.toUpperCase();
  const tokens = asToken(src);

  // --- materialType --------------------------------------------------------
  // Prefer specific multi-word forms first (e.g. "Hex Bolt" over generic "Bolt"),
  // then fall back to single tokens.
  let typeValue: string | null = null;
  let typeSpan = "";
  const scoped = scopedTypeMatch(raw);
  if (scoped) {
    typeValue = scoped.value;
    typeSpan = scoped.span;
  } else {
    for (const t of tokens) {
      if (MATERIAL_TYPES.includes(t.low)) {
        typeValue = t.low.charAt(0).toUpperCase() + t.low.slice(1);
        typeSpan = t.span;
        break;
      }
    }
  }
  const materialType = makeAttribute(
    "materialType",
    typeValue,
    src,
    typeSpan,
    typeValue ? 0.98 : 0
  );

  // --- material family -----------------------------------------------------
  let materialValue: string | null = null;
  let materialSpan = "";
  const lower = " " + src.toLowerCase() + " ";
  const familyKeys = Object.keys(MATERIAL_FAMILIES).sort((a, b) => b.length - a.length);
  for (const key of familyKeys) {
    const m = new RegExp(`\\b${escapeRegExp(key)}\\b`, "i").exec(lower);
    if (m) {
      materialValue = MATERIAL_FAMILIES[key];
      materialSpan = m[0].trim();
      break;
    }
  }
  // stainless grade aliases e.g. SS304, 316L SS
  if (!materialValue) {
    for (const alias of Object.keys(SS_ALIASES)) {
      const m = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").exec(lower);
      if (m) {
        materialValue = "Stainless Steel";
        materialSpan = m[0].trim();
        break;
      }
    }
  }
  const material = makeAttribute(
    "material",
    materialValue,
    src,
    materialSpan,
    materialValue ? 0.95 : 0
  );

  // --- grade ---------------------------------------------------------------
  let gradeValue: string | null = null;
  let gradeSpan = "";

  // steel property class like 8.8 / 10.9 / 12.9
  for (const t of tokens) {
    if (GRADE_STEEL[t.low] && !t.low.includes("mm")) {
      gradeValue = GRADE_STEEL[t.low];
      gradeSpan = t.span;
      break;
    }
  }
  // structural grades like E250 / E350 / A36 / E7018
  if (!gradeValue) {
    for (const t of tokens) {
      if (GRADE_STRUCTURAL[t.low]) {
        gradeValue = GRADE_STRUCTURAL[t.low];
        gradeSpan = t.span;
        break;
      }
    }
  }
  // "grade 8.8" phrasing
  if (!gradeValue) {
    const m = /grade\s+([\d.]+|e\d+[a-z]*)/i.exec(src);
    if (m) {
      const g = m[1].toLowerCase().replace(/\s+/g, "");
      gradeValue = GRADE_STEEL[g] ?? GRADE_STRUCTURAL[g] ?? m[1].toUpperCase();
      gradeSpan = m[0];
    }
  }
  if (!gradeValue) {
    const lk = (k: string) => k.toLowerCase().replace(/[\s-]/g, "");
    // Longest aliases first so SS316L wins over SS316.
    const aliases = Object.keys(SS_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of aliases) {
      if (lk(alias) === lk(raw.replace(/\s/g, "")) || src.toLowerCase().includes(alias.toLowerCase())) {
        const g = SS_ALIASES[alias];
        if (g && gradeValue === null) {
          gradeValue = g;
          const idx = src.toLowerCase().indexOf(alias.toLowerCase());
          gradeSpan = src.slice(idx, idx + alias.length);
          break;
        }
      }
    }
  }
  const grade = makeAttribute("grade", gradeValue, src, gradeSpan, gradeValue ? 0.97 : 0);

  // --- standard ------------------------------------------------------------
  const standardValues: string[] = [];
  const stdSpans: string[] = [];
  for (const key of Object.keys(STANDARDS).sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${escapeRegExp(key)}\\b`, "ig");
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(src)) !== null) {
      const v = STANDARDS[key];
      if (v) {
        standardValues.push(v);
        stdSpans.push(mm[0]);
      }
    }
  }
  const standard = makeAttribute(
    "standard",
    Array.from(new Set(standardValues)),
    src,
    stdSpans.join(" "),
    standardValues.length > 0 ? 0.96 : 0
  );

  // --- coating -------------------------------------------------------------
  let coatingValue: string | null = null;
  let coatingSpan = "";
  for (const key of Object.keys(COATINGS).sort((a, b) => b.length - a.length)) {
    if (!key) continue;
    const m = new RegExp(`\\b${escapeRegExp(key)}\\b`, "i").exec(src);
    if (m) {
      coatingValue = COATINGS[key];
      coatingSpan = m[0];
      break;
    }
  }
  const coating = makeAttribute("coating", coatingValue, src, coatingSpan, coatingValue ? 0.95 : 0);

  // --- pressure class ------------------------------------------------------
  let classValue: string | null = null;
  let classSpan = "";
  for (const key of Object.keys(CLASSES).sort((a, b) => b.length - a.length)) {
    const m = new RegExp(`\\b${escapeRegExp(key)}`, "i").exec(src);
    if (m) {
      classValue = CLASSES[key];
      classSpan = m[0];
      break;
    }
  }
  const classPressure = makeAttribute("classPressure", classValue, src, classSpan, classValue ? 0.96 : 0);

  // --- schedule ------------------------------------------------------------
  let schedValue: string | null = null;
  let schedSpan = "";
  for (const key of Object.keys(SCHEDULES).sort((a, b) => b.length - a.length)) {
    const m = new RegExp(`\\b${escapeRegExp(key)}\\b`, "i").exec(src);
    if (m) {
      schedValue = SCHEDULES[key];
      schedSpan = m[0];
      break;
    }
  }
  const schedule = makeAttribute("schedule", schedValue, src, schedSpan, schedValue ? 0.96 : 0);

  // --- thread --------------------------------------------------------------
  let threadValue: string | null = null;
  let threadSpan = "";
  const threadM = /\b(M\d+(?:\.\d+)?)\b/i.exec(src);
  if (threadM) {
    threadValue = threadM[1].toUpperCase();
    threadSpan = threadM[0];
  }
  const thread = makeAttribute("thread", threadValue, src, threadSpan, threadValue ? 0.98 : 0);

  // --- electrical ----------------------------------------------------------
  const elecSpans: string[] = [];
  const elecRe =
    /(\d+(?:\.\d+)?)\s*(sq\s?mm|sqmm|sq\.?\s?mm|V\b|A\b|KW\b|KVA\b|KV\b|W\b|KVAR|HP\b|VDC|VAC|VA\b)/gi;
  let em: RegExpExecArray | null;
  while ((em = elecRe.exec(src)) !== null) {
    const unit = em[2].toLowerCase().replace(/[\s.]/g, "");
    elecSpans.push(`${em[1]} ${unit}`);
  }
  const electrical = makeAttribute("electrical", Array.from(new Set(elecSpans)), src, elecSpans.join(" "), elecSpans.length > 0 ? 0.94 : 0);

  // --- quantity ------------------------------------------------------------
  const quantityValues = extractQuantityTokens(src);
  const quantity = makeAttribute("quantity", quantityValues, src, quantityValues.join(" "), quantityValues.length > 0 ? 0.93 : 0);

  const dimensions = extractDimensions(src);

  // --- confidence & evidence coverage --------------------------------------
  const attrs = [materialType, material, grade, dimensions, standard, coating, classPressure, schedule, thread, electrical, quantity];
  const all: number[] = attrs.map((a) => a.confidence).filter((x) => x > 0);
  const confidence = all.length === 0 ? 0 : Math.round((all.reduce((s, x) => s + x, 0) / all.length) * 100);

  let covered = 0;
  let relevant = 0;
  for (const a of attrs) {
    const isRelevant = hasValue(a);
    if (isRelevant) relevant++;
    if (isRelevant && a.confidence >= 0.7) covered++;
  }
  const evidenceCoverage = relevant === 0 ? 0 : Math.round((covered / Math.max(relevant, 1)) * 100);

  return {
    materialType,
    material,
    grade,
    dimensions,
    standard,
    coating,
    classPressure,
    schedule,
    thread,
    electrical,
    quantity,
    confidence,
    evidenceCoverage,
  };
}

function scopedTypeMatch(raw: string): { value: string; span: string } | null {
  const map: [RegExp, string][] = [
    [/SOCKET HEAD CAP SCREW/, "Socket Head Cap Screw"],
    [/HEXAGON HEAD BOLT|HEXAGON BOLT|HEX HEAD BOLT|HEX BOLT/, "Hex Bolt"],
    [/PILLOW BLOCK/, "Pillow Block"],
    [/BALL VALVE/, "Ball Valve"],
    [/GATE VALVE/, "Gate Valve"],
    [/GLOBE VALVE/, "Globe Valve"],
    [/CHECK VALVE/, "Check Valve"],
    [/BUTTERFLY VALVE/, "Butterfly Valve"],
    [/PLUG VALVE/, "Plug Valve"],
    [/SAFETY VALVE/, "Safety Valve"],
    [/ANGLE VALVE/, "Angle Valve"],
    [/SOLENOID VALVE/, "Solenoid Valve"],
    [/CONTROL VALVE/, "Control Valve"],
    [/SHUT OFF VALVE|SHUTOFF/, "Shutoff Valve"],
    [/DEEP GROOVE/, "Deep Groove Bearing"],
    [/BALL BEARING/, "Ball Bearing"],
    [/WIRE ROPE/, "Wire Rope"],
    [/CABLE TRAY/, "Cable Tray"],
    [/EARTHING ROD|EARTH ROD/, "Earth Rod"],
    [/CHECKERED PLATE|CHEQUERED PLATE/, "Chequered Plate"],
    [/HOT ROLLED/, "Hot Rolled"],
    [/CONDUIT/, "Conduit"],
    [/SIGHT GLASS/, "Sight Glass"],
    [/HEAT EXCHANGER/, "Heat Exchanger"],
    [/MECHANICAL SEAL/, "Mechanical Seal"],
    [/FILTER/, "Filter"],
    [/STARTER/, "Motor Starter"],
    [/CIRCUIT BREAKER|BREAKER/, "Circuit Breaker"],
    [/CONTACTOR/, "Contactor"],
    [/POWER CAPACITOR|CAPACITOR/, "Power Capacitor"],
    [/RECTIFIER/, "Rectifier"],
    [/PLC/, "PLC Module"],
    [/TRANSFORMER/, "Transformer"],
  ];
  const upper = raw.toUpperCase();
  for (const [re, v] of map) {
    const m = re.exec(upper);
    if (m) return { value: v, span: raw.slice(m.index, m.index + m[0].length) };
  }
  return null;
}

function hasValue(a: Attribute<unknown>): boolean {
  const v = a.value;
  if (v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim().length > 0;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function listRelevantAttributes(dna: MaterialDNA): string[] {
  return Object.entries(dna)
    .filter(([key]) => key !== "confidence" && key !== "evidenceCoverage")
    .filter(([, attr]) => hasValue(attr as Attribute))
    .map(([key]) => key);
}

export function listUnknownAttributes(dna: MaterialDNA): string[] {
  return Object.entries(dna)
    .filter(([key]) => key !== "confidence" && key !== "evidenceCoverage")
    .filter(([, attr]) => !hasValue(attr as Attribute))
    .map(([key]) => key);
}