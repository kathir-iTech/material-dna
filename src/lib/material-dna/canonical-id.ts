import type { MaterialDNA } from "@/types/domain";

// ---------------------------------------------------------------------------
// Structured National Material Code generator
//
//   MDNA-{MATERIAL}-{TYPE}-{DIMENSION}-{STANDARD}-{HASH4}
//
// MATERIAL / TYPE / DIMENSION / STANDARD are read straight from the resolved
// MaterialDNA attribute values and compacted internally (no spaces, no
// internal hyphens), so the only hyphens in the final string are the five
// true segment separators. HASH4 is four hex characters of an FNV-1a 32
// bit hash over the full canonical attribute set, so the same DNA always
// yields the same code and any changed critical attribute (grade, class, ...)
// changes the code. Deterministic — no external crypto dependency.
// ---------------------------------------------------------------------------

/** Every canonical attribute that participates in the identity hash. */
export const CANONICAL_ATTRIBUTE_KEYS = [
  "materialType",
  "material",
  "grade",
  "dimensions",
  "standard",
  "coating",
  "classPressure",
  "schedule",
  "thread",
  "electrical",
  "quantity",
] as const satisfies readonly (keyof MaterialDNA)[];

/** FNV-1a 32-bit hash, unsigned. */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(",");
  return String(value);
}

/** Stable, order-fixed serialization of the full canonical attribute set. */
export function canonicalAttributeSet(dna: MaterialDNA): string {
  return CANONICAL_ATTRIBUTE_KEYS.map((key) => `${key}=${serializeValue(attributeValue(dna, key))}`).join(
    "|"
  );
}

function attributeValue(dna: MaterialDNA, key: keyof MaterialDNA): unknown {
  const attr = (dna as unknown as Record<string, { value?: unknown }>)[key];
  return attr?.value ?? null;
}

/** Four hex characters of the canonical attribute-set hash. */
export function canonicalHash4(dna: MaterialDNA): string {
  return (fnv1a32(canonicalAttributeSet(dna)) >>> 0)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0")
    .slice(-4);
}

function cleanPart(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .trim()
    .toUpperCase()
    // "M12 × 60 mm" -> "M12X60MM": the multiplication sign is a letter-like
    // separator inside the value, not a segment boundary.
    .replace(/[×✕]/g, "X")
    // Compact the field's own value: no spaces, no internal hyphens, so the
    // only hyphens in the final code are the five true segment separators.
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * One segment of the code: internal word breaks are stripped ("HEX BOLT" ->
 * "HEXBOLT", "DIN 931" -> "DIN931"). Multiple values inside one attribute are
 * joined with "+" so they stay distinguishable without introducing a hyphen.
 */
function segment(value: unknown): string {
  const parts = Array.isArray(value) ? value : [value];
  const cleaned = parts.map(cleanPart).filter((p) => p.length > 0);
  return cleaned.length > 0 ? cleaned.join("+") : "NA";
}

/**
 * Generate the structured canonical identity for a resolved MaterialDNA.
 * Pure and stable: identical DNA in -> identical code out.
 */
export function generateCanonicalId(dna: MaterialDNA): string {
  const material = segment(attributeValue(dna, "material"));
  const materialType = segment(attributeValue(dna, "materialType"));
  const dimensions = segment(attributeValue(dna, "dimensions"));
  const standard = segment(attributeValue(dna, "standard"));
  return `MDNA-${material}-${materialType}-${dimensions}-${standard}-${canonicalHash4(dna)}`;
}
