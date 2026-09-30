// ---------------------------------------------------------------------------
// Dimension unit equivalence tables.
//
// Sources:
// - 1 inch = 25.4 mm EXACT (international inch, 1959 yard/pound agreement;
//   exact by definition in SI terms).
// - NPS (nominal pipe size, inches) -> DN (nominal diameter, mm) pairing per
//   ISO 6708-1 — the mapping used by ASME B36.10M pipe dimensions and
//   ASME/ANSI B16.5 flange standards.
//
// NPS/DN series coverage: the full ISO 6708-1 / ASME B36.10M pairing from
// NPS 1/8 (DN6) through NPS 96 (DN2400), including the intermediate sizes
// NPS 3.5/7/9/14-24 step 2/26-48 step 2/52-64 step 4/72-96 step 8 that
// appear in ASME B16.5 Table 2 and B36.10M dimensional tables — 46 entries.
// ---------------------------------------------------------------------------

export const INCH_TO_MM = 25.4;

const NPS_TO_DN: Record<string, number> = {
  "1/8": 6,
  "1/4": 8,
  "3/8": 10,
  "1/2": 15,
  "3/4": 20,
  "1": 25,
  "1.25": 32,
  "1.5": 40,
  "2": 50,
  "2.5": 65,
  "3": 80,
  "3.5": 90,
  "4": 100,
  "5": 125,
  "6": 150,
  "7": 175,
  "8": 200,
  "9": 225,
  "10": 250,
  "12": 300,
  "14": 350,
  "16": 400,
  "18": 450,
  "20": 500,
  "22": 550,
  "24": 600,
  "26": 650,
  "28": 700,
  "30": 750,
  "32": 800,
  "34": 850,
  "36": 900,
  "38": 950,
  "40": 1000,
  "42": 1050,
  "44": 1100,
  "46": 1150,
  "48": 1200,
  "52": 1300,
  "56": 1400,
  "60": 1500,
  "64": 1600,
  "72": 1800,
  "80": 2000,
  "88": 2200,
  "96": 2400,
};

/** Number of NPS -> DN rows in the table (46 = full ISO 6708-1 series). */
export const NPS_DN_ENTRY_COUNT = Object.keys(NPS_TO_DN).length;

function parseLooseNumber(s: string): number {
  const t = s.replace(/\s+/g, "");
  if (t.includes("/")) {
    const [num, den] = t.split("/").map((x) => parseFloat(x));
    if (isNaN(num) || isNaN(den) || den === 0) return NaN;
    return num / den;
  }
  return parseFloat(t);
}

const NPS_NUMERIC: Record<number, number> = {};
for (const [k, v] of Object.entries(NPS_TO_DN)) NPS_NUMERIC[parseLooseNumber(k)] = v;
const DN_VALUES = new Set(Object.values(NPS_TO_DN));

interface DimValue {
  mm: number;
  dn: number | null;
  inchOrigin: boolean;
}

function mmValue(n: number): DimValue {
  return { mm: n, dn: DN_VALUES.has(n) ? n : null, inchOrigin: false };
}

function inchValue(raw: string, mm: number): DimValue | null {
  const inch = parseLooseNumber(raw);
  if (isNaN(inch)) return null;
  return {
    mm,
    dn: NPS_NUMERIC[inch] ?? null,
    inchOrigin: true,
  };
}

// Normalized token forms emitted by the extractor:
//   "50 mm", "1 m", "2″ (50.8 mm)", "1/2″ (12.7 mm)", "50 × 50 mm",
//   "M12 × 60 mm".
function parseToken(token: string): DimValue[] | null {
  const t = token.trim().toLowerCase().replace(/\s+/g, " ");

  let m = /^(\d+(?:\.\d+)?)\s*mm$/.exec(t);
  if (m) return [mmValue(parseFloat(m[1]))];

  m = /^(\d+(?:\.\d+)?)\s*m$/.exec(t);
  if (m) return [mmValue(parseFloat(m[1]) * 1000)];

  // Inch with exact-mm parenthetical: 1/2″ (12.7 mm)
  m = /^([0-9]+(?:\.[0-9]+)?(?:\s*\/\s*[0-9]+)?)\s*[″"]\s*\(\s*(\d+(?:\.\d+)?)\s*mm\s*\)$/.exec(t);
  if (m) {
    const v = inchValue(m[1], parseFloat(m[2]));
    return v ? [v] : null;
  }

  // Bare inch token: 2″
  m = /^([0-9]+(?:\.[0-9]+)?(?:\s*\/\s*[0-9]+)?)\s*[″"]$/.exec(t);
  if (m) {
    const inch = parseLooseNumber(m[1]);
    if (isNaN(inch)) return null;
    const v = inchValue(m[1], inch * INCH_TO_MM);
    return v ? [v] : null;
  }

  // Nominal designation tokens: "DN 100" / "dn100" (ISO 6708-1, mm nominal)
  // and "NPS 4" / "NPS 1/2" (inch nominal, mapped through NPS_TO_DN).
  m = /^dn\s*(\d+)$/.exec(t);
  if (m) return [mmValue(parseInt(m[1], 10))];

  m = /^nps\s*([0-9]+(?:\.[0-9]+)?(?:\s*\/\s*[0-9]+)?)$/.exec(t);
  if (m) {
    const inch = parseLooseNumber(m[1]);
    if (isNaN(inch)) return null;
    const v = inchValue(m[1], inch * INCH_TO_MM);
    return v ? [v] : null;
  }

  // Thread form: M12 × 60 mm
  m = /^m(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)(?:\s*×\s*(\d+(?:\.\d+)?))?\s*mm$/.exec(t);
  if (m) return [mmValue(parseFloat(m[1])), mmValue(parseFloat(m[2])), ...(m[3] ? [mmValue(parseFloat(m[3]))] : [])];

  // Compound: 50 × 50 mm / 1000 × 2000 mm
  if (/^\d+(?:\.\d+)?\s*×/.test(t) && t.endsWith("mm")) {
    const nums = t.replace(/mm$/, "").match(/\d+(?:\.\d+)?/g);
    if (nums) return nums.map((n) => mmValue(parseFloat(n)));
  }

  return null;
}

function parseList(tokens: string[]): DimValue[] | null {
  const out: DimValue[] = [];
  for (const tk of tokens) {
    const parsed = parseToken(tk);
    if (!parsed) return null;
    out.push(...parsed);
  }
  return out;
}

function valuesEquivalent(a: DimValue, b: DimValue): boolean {
  if (a.dn !== null && b.dn !== null && a.dn === b.dn) return true;
  if (Math.abs(a.mm - b.mm) < 1e-9) return true;
  // Rounding tolerance only when one side originates from an inch notation
  // (1/2" = 12.7 mm is often written as 12.5/15 in catalogue data).
  if (a.inchOrigin || b.inchOrigin) {
    const tol = Math.max(0.3, 0.02 * Math.min(a.mm, b.mm));
    return Math.abs(a.mm - b.mm) <= tol;
  }
  return false;
}

function matchAll(from: DimValue[], pool: DimValue[]): boolean {
  const used = pool.map(() => false);
  for (const f of from) {
    const i = pool.findIndex((p, idx) => !used[idx] && valuesEquivalent(f, p));
    if (i < 0) return false;
    used[i] = true;
  }
  return true;
}

function matchCount(from: DimValue[], pool: DimValue[]): number {
  const used = pool.map(() => false);
  let n = 0;
  for (const f of from) {
    const i = pool.findIndex((p, idx) => !used[idx] && valuesEquivalent(f, p));
    if (i < 0) continue;
    used[i] = true;
    n++;
  }
  return n;
}

function legacyEqual(a: string[], b: string[]): boolean {
  const na = a.map((x) => x.trim().toLowerCase()).sort();
  const nb = b.map((x) => x.trim().toLowerCase()).sort();
  return JSON.stringify(na) === JSON.stringify(nb);
}

/**
 * True when two extractor dimension lists state the same sizes, allowing for
 * unit systems (inch vs mm vs m), nominal pipe sizes (NPS/DN), token
 * structure differences ("40 × 6 mm" vs "40 mm" + "6 mm"), and multiplicity
 * (50 × 50 × 3 != 50 × 3 × 3). Falls back to exact string multiset equality
 * when any token is not a recognized length form (e.g. "5 sq mm").
 */
export function dimensionListsEquivalent(a: string[], b: string[]): boolean {
  const fa = parseList(a);
  const fb = parseList(b);
  if (!fa || !fb) return legacyEqual(a, b);
  if (fa.length === 0 || fb.length === 0) return fa.length === fb.length;
  return matchAll(fa, fb) && matchAll(fb, fa);
}

/**
 * Fraction of the larger dimension list that can be matched into the other
 * side (0..1). Used as a scoring signal; the veto path uses the stricter
 * `dimensionListsEquivalent`.
 */
export function dimensionMatchRatio(a: string[], b: string[]): number {
  const fa = parseList(a);
  const fb = parseList(b);
  if (!fa || !fb) {
    if (a.length === 0 || b.length === 0) return 0;
    const inter = a.filter((x) => b.includes(x)).length;
    return inter / Math.max(a.length, b.length);
  }
  if (fa.length === 0 || fb.length === 0) return 0;
  return matchCount(fa, fb) / Math.max(fa.length, fb.length);
}
