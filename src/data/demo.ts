import type {
  CanonicalMaterial,
  DemoScenario,
  LegacyMapping,
  MaterialRecord,
  ReviewCase,
  SourceName,
} from "@/types/domain";
import { extractMaterialDNA } from "@/lib/material-dna/extraction";
import { normalizeDescription } from "@/lib/material-dna/normalization";
import { generateCanonicalId } from "@/lib/material-dna/canonical-id";

// ---------------------------------------------------------------------------
// DEMO DATA — synthetic / demonstration records. Not real CPSE production data.
// ---------------------------------------------------------------------------

interface RawSourceRecord {
  id: string;
  source: SourceName;
  sourceCode: string;
  rawDescription: string;
}

const RAW_RECORDS: RawSourceRecord[] = [
  // --- HEX BOLTS (Scenario 1 & 2) -----------------------------------------
  { id: "REC-001", source: "CPSE-A", sourceCode: "MAT-18273", rawDescription: "HEX BOLT M12 X 60 8.8 ZP DIN 931" },
  { id: "REC-002", source: "CPSE-B", sourceCode: "009821", rawDescription: "HEXAGON HEAD BOLT M12 X 60 CLASS 8.8 ZINC PLATED DIN 931" },
  { id: "REC-003", source: "CPSE-C", sourceCode: "MAT-007114", rawDescription: "HEX BOLT M12 X 50 CLASS 8.8 ZINC PLATED" },
  { id: "REC-004", source: "Legacy ERP", sourceCode: "BOLT-88321", rawDescription: "HEXAGON BOLT M12 X 60 CLASS 10.9 ZINC PLATED DIN 931" },
  { id: "REC-005", source: "Supplier Catalog", sourceCode: "HX-M12-60-8.8", rawDescription: "Hex Bolt M12x60 8.8 Zn DIN931" },
  { id: "REC-006", source: "CPSE-A", sourceCode: "MAT-18820", rawDescription: "M16 X 80 HEX BOLT 8.8 ZP DIN 931" },
  { id: "REC-007", source: "CPSE-B", sourceCode: "010233", rawDescription: "HEX BOLT M16X80 CL 8.8 GALVANISED DIN 931" },
  { id: "REC-008", source: "CPSE-A", sourceCode: "MAT-19104", rawDescription: "HEX BOLT M16 X 80 10.9 ZP DIN 931" },
  { id: "REC-009", source: "CPSE-C", sourceCode: "MAT-010205", rawDescription: "HEXAGON BOLT M16 X 80 GRADE 10.9 ZINC" },
  { id: "REC-010", source: "Legacy ERP", sourceCode: "BOLT-88990", rawDescription: "HEX BOLT M12 X 60 9.8 ZP DIN 931" },
  { id: "REC-011", source: "Supplier Catalog", sourceCode: "HX-M12-60-10.9", rawDescription: "Hex Bolt M12 x 60 Class 10.9 Zinc DIN 931" },
  { id: "REC-012", source: "CPSE-B", sourceCode: "012044", rawDescription: "HEX BOLT M12 X 60 8.8 BLUE ZINC DIN 931" },

  // --- STAINLESS STEEL PIPE -------------------------------------------------
  { id: "REC-013", source: "CPSE-A", sourceCode: "MAT-20311", rawDescription: "SS304 STAINLESS STEEL PIPE 50MM OD X 3MM WALL" },
  { id: "REC-014", source: "CPSE-B", sourceCode: "014520", rawDescription: "STAINLESS STEEL 304 SEAMLESS PIPE 50MM X 3MM" },
  { id: "REC-015", source: "CPSE-C", sourceCode: "MAT-025110", rawDescription: "SS316L STAINLESS STEEL PIPE 50MM OD X 3MM WALL" },
  { id: "REC-016", source: "Supplier Catalog", sourceCode: "SSP-304-50", rawDescription: "SS 304 Seamless Pipe 50 mm OD x 3 mm" },
  { id: "REC-017", source: "CPSE-A", sourceCode: "MAT-20450", rawDescription: "SS316 PIPE 2 INCH SCH 40 ASTM A312" },
  { id: "REC-018", source: "CPSE-B", sourceCode: "016611", rawDescription: "STAINLESS STEEL PIPE 3 INCH SCH 40 ASTM A312" },
  { id: "REC-019", source: "CPSE-C", sourceCode: "MAT-030120", rawDescription: "SS316L WELDED PIPE 100MM X 6M" },
  { id: "REC-020", source: "Legacy ERP", sourceCode: "PIPE-A106-2", rawDescription: "CARBON STEEL PIPE 2 INCH SCH 40 ASTM A106" },
  { id: "REC-021", source: "CPSE-A", sourceCode: "MAT-21090", rawDescription: "MS PIPE 50MM CLASS A ERW 6M" },
  { id: "REC-022", source: "CPSE-B", sourceCode: "018240", rawDescription: "GI PIPE CLASS C 2 INCH BIS 1239" },
  { id: "REC-023", source: "Supplier Catalog", sourceCode: "GP-C-2IN", rawDescription: "GI Pipe Class C 2 inch IS 1239" },
  { id: "REC-024", source: "CPSE-C", sourceCode: "MAT-034400", rawDescription: "GI PIPE CLASS B 2 INCH IS 1239" },
  { id: "REC-025", source: "CPSE-A", sourceCode: "MAT-21345", rawDescription: "MS PIPE 80MM SCH 40 ERW 6M" },

  // --- STRUCTURAL PLATES ----------------------------------------------------
  { id: "REC-026", source: "CPSE-A", sourceCode: "MAT-22081", rawDescription: "MS PLATE 12MM HOT ROLLED IS 2062" },
  { id: "REC-027", source: "CPSE-B", sourceCode: "020910", rawDescription: "MILD STEEL PLATE 12MM IS 2062 E250" },
  { id: "REC-028", source: "CPSE-C", sourceCode: "MAT-045003", rawDescription: "IS 2062 E250A STRUCTURAL STEEL PLATE 10MM" },
  { id: "REC-029", source: "CPSE-A", sourceCode: "MAT-22120", rawDescription: "IS 2062 E350C STRUCTURAL STEEL PLATE 10MM" },
  { id: "REC-030", source: "Shop", sourceCode: "PLT-A36-10", rawDescription: "ASTM A36 CARBON STEEL PLATE 10MM" },
  { id: "REC-031", source: "CPSE-B", sourceCode: "022310", rawDescription: "MS CHEQUERED PLATE 5MM 1000X2000MM" },
  { id: "REC-032", source: "Legacy ERP", sourceCode: "PLATE-2062-K", rawDescription: "MILD STEEL PLATE 16MM IS 2062" },

  // --- CABLE / ELECTRICAL ---------------------------------------------------
  { id: "REC-033", source: "CPSE-A", sourceCode: "MAT-23110", rawDescription: "ELECTRICAL CABLE 2.5 SQ MM 3 CORE COPPER XLPE" },
  { id: "REC-034", source: "CPSE-B", sourceCode: "024120", rawDescription: "3 CORE 2.5 SQMM COPPER XLPE CABLE" },
  { id: "REC-035", source: "CPSE-C", sourceCode: "MAT-050110", rawDescription: "ELECTRICAL CABLE 4 SQ MM 3 CORE COPPER XLPE" },
  { id: "REC-036", source: "Supplier Catalog", sourceCode: "CAB-2.5-3C", rawDescription: "2.5 sq mm 3 core copper XLPE cable 415V" },
  { id: "REC-037", source: "CPSE-A", sourceCode: "MAT-23550", rawDescription: "POWER CABLE 4 SQ MM 4 CORE COPPER 230V" },
  { id: "REC-038", source: "Legacy ERP", sourceCode: "CAB-4-3C-415", rawDescription: "4 SQ MM 3 CORE XLPE ARMOURED CABLE 415 V" },

  // --- VALVES ---------------------------------------------------------------
  { id: "REC-039", source: "CPSE-A", sourceCode: "MAT-24010", rawDescription: "BALL VALVE 1/2 INCH SS304 FULL PORT BLOWOUT PROOF" },
  { id: "REC-040", source: "CPSE-B", sourceCode: "026330", rawDescription: "SS304 FULL PORT BLOWOUT PROOF BALL VALVE 15MM" },
  { id: "REC-041", source: "CPSE-C", sourceCode: "MAT-055004", rawDescription: "BALL VALVE 1/2 INCH SS316 FULL PORT BLOWOUT PROOF" },
  { id: "REC-042", source: "CPSE-A", sourceCode: "MAT-24150", rawDescription: "GATE VALVE 2 INCH SS316 FLANGED CLASS 150 ANSI" },
  { id: "REC-043", source: "CPSE-B", sourceCode: "027510", rawDescription: "SS316 FLANGED GATE VALVE 50MM CLASS 150 ASME" },
  { id: "REC-044", source: "CPSE-C", sourceCode: "MAT-056140", rawDescription: "GATE VALVE 2 INCH SS316 FLANGED CLASS 300 ANSI" },
  { id: "REC-045", source: "CPSE-A", sourceCode: "MAT-24420", rawDescription: "GLOBE VALVE 2 INCH SS316 FLANGED" },
  { id: "REC-046", source: "CPSE-B", sourceCode: "029320", rawDescription: "SS316 FLANGED GLOBE VALVE 50MM" },
  { id: "REC-047", source: "Supplier Catalog", sourceCode: "BV-SS-15", rawDescription: "Ball valve SS304 15 mm full bore 150#" },
  { id: "REC-048", source: "CPSE-A", sourceCode: "MAT-24710", rawDescription: "CONTROL VALVE 1 INCH GLOBE TYPE PNEUMATIC" },
  { id: "REC-049", source: "Legacy ERP", sourceCode: "VALVE-CV-1", rawDescription: "PNEUMATIC GLOBE TYPE CONTROL VALVE 25MM" },

  // --- FLANGES --------------------------------------------------------------
  { id: "REC-050", source: "CPSE-A", sourceCode: "MAT-25100", rawDescription: "FLANGE 150# RF SS304 ANSI B16.5" },
  { id: "REC-051", source: "CPSE-B", sourceCode: "030140", rawDescription: "SS304 RF FLANGE 150# ASME B16.5" },
  { id: "REC-052", source: "CPSE-C", sourceCode: "MAT-060120", rawDescription: "FLANGE 300# RF SS304 ANSI B16.5" },

  // --- BEARINGS -------------------------------------------------------------
  { id: "REC-053", source: "CPSE-A", sourceCode: "MAT-26040", rawDescription: "INDUSTRIAL BEARING 6205 25X52X15MM" },
  { id: "REC-054", source: "CPSE-B", sourceCode: "032100", rawDescription: "SKF 6205 DEEP GROOVE BALL BEARING 25X52X15" },
  { id: "REC-055", source: "CPSE-C", sourceCode: "MAT-065011", rawDescription: "INDUSTRIAL BEARING 6206 30X62X16MM" },
  { id: "REC-056", source: "Supplier Catalog", sourceCode: "BG-6205", rawDescription: "Bearing 6205 25x52x15 deep groove" },

  // --- GASKETS / FITTINGS ---------------------------------------------------
  { id: "REC-057", source: "CPSE-A", sourceCode: "MAT-27100", rawDescription: "RUBBER GASKET 3MM THICK 100MM ID NBR" },
  { id: "REC-058", source: "CPSE-B", sourceCode: "034010", rawDescription: "NBR RUBBER GASKET ID 100MM THK 3MM" },
  { id: "REC-059", source: "CPSE-C", sourceCode: "MAT-070102", rawDescription: "PTFE GASKET 3MM THICK 100MM ID" },
  { id: "REC-060", source: "CPSE-A", sourceCode: "MAT-27500", rawDescription: "COMPRESSION FITTING 15MM COPPER" },
  { id: "REC-061", source: "CPSE-B", sourceCode: "035420", rawDescription: "COPPER COMPRESSION FITTING 15MM" },

  // --- STRUCTURAL SECTIONS --------------------------------------------------
  { id: "REC-062", source: "CPSE-A", sourceCode: "MAT-28400", rawDescription: "MS ANGLE 50X50X5MM IS 2062" },
  { id: "REC-063", source: "CPSE-B", sourceCode: "036910", rawDescription: "IS 2062 MS EQUAL ANGLE 50X50X5" },
  { id: "REC-064", source: "CPSE-C", sourceCode: "MAT-075003", rawDescription: "MS ANGLE 75X75X6MM IS 2062" },
  { id: "REC-065", source: "CPSE-A", sourceCode: "MAT-28610", rawDescription: "MS FLAT BAR 40X6MM IS 2062" },
  { id: "REC-066", source: "Supplier Catalog", sourceCode: "FL-40X6", rawDescription: "IS 2062 MS Flat 40mm x 6mm" },
  { id: "REC-067", source: "CPSE-B", sourceCode: "038220", rawDescription: "MS CHANNEL ISMC 100 100X50X5MM" },

  // --- FASTENERS (misc) -----------------------------------------------------
  { id: "REC-068", source: "CPSE-A", sourceCode: "MAT-29100", rawDescription: "SOCKET HEAD CAP SCREW M8X30 GRADE 12.9" },
  { id: "REC-069", source: "CPSE-B", sourceCode: "039410", rawDescription: "GRADE 12.9 SOCKET HEAD CAP SCREW M8 X 30" },
  { id: "REC-070", source: "CPSE-C", sourceCode: "MAT-080101", rawDescription: "SOCKET HEAD CAP SCREW M8X30 GRADE 10.9" },
  { id: "REC-071", source: "CPSE-A", sourceCode: "MAT-29400", rawDescription: "ANCHOR BOLT M16X200 CHEMICAL TYPE" },
  { id: "REC-072", source: "CPSE-B", sourceCode: "041220", rawDescription: "CHEMICAL ANCHOR BOLT M16 LENGTH 200MM" },

  // --- MOTOR / ELECTRICAL GEAR ---------------------------------------------
  { id: "REC-073", source: "CPSE-A", sourceCode: "MAT-30100", rawDescription: "MOTOR STARTER 7.5HP DOL AC3" },
  { id: "REC-074", source: "CPSE-B", sourceCode: "043300", rawDescription: "DOL STARTER 7.5 HP AC3 CATEGORY" },
  { id: "REC-075", source: "CPSE-C", sourceCode: "MAT-085001", rawDescription: "MOTOR STARTER 10HP DOL AC3" },
  { id: "REC-076", source: "CPSE-A", sourceCode: "MAT-30500", rawDescription: "VFD DRIVE 10HP 380V 3 PHASE" },
  { id: "REC-077", source: "Legacy ERP", sourceCode: "DRV-380-10H", rawDescription: "3 PHASE 10HP VFD 380V" },
  { id: "REC-078", source: "CPSE-B", sourceCode: "045610", rawDescription: "VFD DRIVE 15HP 380V 3 PHASE" },

  // --- MISCELLANEOUS --------------------------------------------------------
  { id: "REC-079", source: "CPSE-A", sourceCode: "MAT-31100", rawDescription: "INDUSTRIAL GREASE NLGI 2 LITHIUM BASED" },
  { id: "REC-080", source: "CPSE-B", sourceCode: "047200", rawDescription: "LITHIUM BASED INDUSTRIAL GREASE NLGI 2" },
  { id: "REC-081", source: "CPSE-A", sourceCode: "MAT-31500", rawDescription: "WELDING ROD E7018 3.15MM 5KG PACK" },
  { id: "REC-082", source: "Supplier Catalog", sourceCode: "WR-E7018", rawDescription: "E7018 Welding Electrode 3.15mm 5 Kg" },
  { id: "REC-083", source: "CPSE-C", sourceCode: "MAT-090105", rawDescription: "WELDING ROD E6013 3.15MM 5KG PACK" },
  { id: "REC-084", source: "CPSE-A", sourceCode: "MAT-32010", rawDescription: "TEFLON PTFE SHEET 5MM THICK WHITE" },
  { id: "REC-085", source: "CPSE-B", sourceCode: "049810", rawDescription: "WHITE PTFE TEFLON SHEET 5MM THICK" },
  { id: "REC-086", source: "CPSE-A", sourceCode: "MAT-32600", rawDescription: "CONVEYOR BELT EP 800/3 600MM WIDTH" },
  { id: "REC-087", source: "CPSE-C", sourceCode: "MAT-095002", rawDescription: "EP 800/3 CONVEYOR BELT 800MM WIDE" },
  { id: "REC-088", source: "CPSE-B", sourceCode: "052300", rawDescription: "HYDRAULIC HOSE 1/2 INCH 2 WIRE BSP" },
  { id: "REC-089", source: "CPSE-A", sourceCode: "MAT-33100", rawDescription: "CABLE GLAND 20MM BRASS IP68" },
  { id: "REC-090", source: "Supplier Catalog", sourceCode: "CG-20-B", rawDescription: "Brass cable gland 20mm IP68" },
  { id: "REC-091", source: "CPSE-C", sourceCode: "MAT-100010", rawDescription: "CABLE GLAND 25MM BRASS IP68" },
  { id: "REC-092", source: "CPSE-A", sourceCode: "MAT-33800", rawDescription: "PRESSURE GAUGE 0-100 BAR SS304 100MM DIAL" },
  { id: "REC-093", source: "Legacy ERP", sourceCode: "GAUGE-100B", rawDescription: "SS304 PRESSURE GAUGE 0-100 BAR 100MM DIAL" },
  { id: "REC-094", source: "CPSE-B", sourceCode: "055300", rawDescription: "PROXIMITY SENSOR M12 10MM PNP NO" },
  { id: "REC-095", source: "CPSE-A", sourceCode: "MAT-34110", rawDescription: "PNEUMATIC CYLINDER 63MM BORE 300MM STROKE" },
  { id: "REC-096", source: "Legacy ERP", sourceCode: "CYL-63-300", rawDescription: "300MM STROKE PNEUMATIC CYLINDER 63MM BORE" },
  { id: "REC-097", source: "CPSE-B", sourceCode: "057200", rawDescription: "CIRCUIT BREAKER 63A 4 POLE 415V" },
  { id: "REC-098", source: "CPSE-C", sourceCode: "MAT-110002", rawDescription: "CIRCUIT BREAKER 100A 4 POLE 415V" },
];

// ---------------------------------------------------------------------------
// Build typed records with extracted DNA
// ---------------------------------------------------------------------------

export const materialRecords: MaterialRecord[] = RAW_RECORDS.map((raw) => {
  const normalizedDescription = normalizeDescription(raw.rawDescription);
  const dna = extractMaterialDNA(normalizedDescription);
  return {
    id: raw.id,
    source: raw.source,
    sourceCode: raw.sourceCode,
    rawDescription: raw.rawDescription,
    normalizedDescription,
    dna,
  };
});

// ---------------------------------------------------------------------------
// Canonical materials derived from the source records (top-of-cluster)
// ---------------------------------------------------------------------------

const CANONICAL_SEEDS: Array<{
  seedId: string;
  extraCodes: LegacyMapping[];
}> = [
  {
    seedId: "REC-001",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "009821", sourceDescription: "HEXAGON HEAD BOLT M12 X 60 CLASS 8.8 ZINC PLATED DIN 931" },
      { source: "Supplier Catalog", legacyCode: "HX-M12-60-8.8", sourceDescription: "Hex Bolt M12x60 8.8 Zn DIN931" },
    ],
  },
  {
    seedId: "REC-013",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "014520", sourceDescription: "STAINLESS STEEL 304 SEAMLESS PIPE 50MM X 3MM" },
      { source: "Supplier Catalog", legacyCode: "SSP-304-50", sourceDescription: "SS 304 Seamless Pipe 50 mm OD x 3 mm" },
    ],
  },
  {
    seedId: "REC-026",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "020910", sourceDescription: "MILD STEEL PLATE 12MM IS 2062 E250" },
    ],
  },
  {
    seedId: "REC-033",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "024120", sourceDescription: "3 CORE 2.5 SQMM COPPER XLPE CABLE" },
      { source: "Supplier Catalog", legacyCode: "CAB-2.5-3C", sourceDescription: "2.5 sq mm 3 core copper XLPE cable 415V" },
    ],
  },
  {
    seedId: "REC-039",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "026330", sourceDescription: "SS304 FULL PORT BLOWOUT PROOF BALL VALVE 15MM" },
    ],
  },
  {
    seedId: "REC-053",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "032100", sourceDescription: "SKF 6205 DEEP GROOVE BALL BEARING 25X52X15" },
      { source: "Supplier Catalog", legacyCode: "BG-6205", sourceDescription: "Bearing 6205 25x52x15 deep groove" },
    ],
  },
  {
    seedId: "REC-057",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "034010", sourceDescription: "NBR RUBBER GASKET ID 100MM THK 3MM" },
    ],
  },
  {
    seedId: "REC-062",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "036910", sourceDescription: "IS 2062 MS EQUAL ANGLE 50X50X5" },
    ],
  },
  {
    seedId: "REC-068",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "039410", sourceDescription: "GRADE 12.9 SOCKET HEAD CAP SCREW M8 X 30" },
    ],
  },
  {
    seedId: "REC-073",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "043300", sourceDescription: "DOL STARTER 7.5 HP AC3 CATEGORY" },
    ],
  },
  {
    seedId: "REC-076",
    extraCodes: [
      { source: "Legacy ERP", legacyCode: "DRV-380-10H", sourceDescription: "3 PHASE 10HP VFD 380V" },
    ],
  },
  {
    seedId: "REC-079",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "047200", sourceDescription: "LITHIUM BASED INDUSTRIAL GREASE NLGI 2" },
    ],
  },
  {
    seedId: "REC-081",
    extraCodes: [
      { source: "Supplier Catalog", legacyCode: "WR-E7018", sourceDescription: "E7018 Welding Electrode 3.15mm 5 Kg" },
    ],
  },
  {
    seedId: "REC-084",
    extraCodes: [
      { source: "CPSE-B", legacyCode: "049810", sourceDescription: "WHITE PTFE TEFLON SHEET 5MM THICK" },
    ],
  },
  {
    seedId: "REC-092",
    extraCodes: [
      { source: "Legacy ERP", legacyCode: "GAUGE-100B", sourceDescription: "SS304 PRESSURE GAUGE 0-100 BAR 100MM DIAL" },
    ],
  },
  {
    seedId: "REC-095",
    extraCodes: [
      { source: "Legacy ERP", legacyCode: "CYL-63-300", sourceDescription: "300MM STROKE PNEUMATIC CYLINDER 63MM BORE" },
    ],
  },
  {
    seedId: "REC-020",
    extraCodes: [
      { source: "CPSE-C", legacyCode: "PIPE-106-2S", sourceDescription: "CARBON STEEL PIPE 2 IN SCH 40 ASTM A106" },
    ],
  },
  {
    seedId: "REC-022",
    extraCodes: [
      { source: "Supplier Catalog", legacyCode: "GP-C-2IN", sourceDescription: "GI Pipe Class C 2 inch IS 1239" },
    ],
  },
];

export const canonicalMaterials: CanonicalMaterial[] = CANONICAL_SEEDS.map((seed) => {
  const record = materialRecords.find((r) => r.id === seed.seedId)!;
  const extraSources: SourceName[] = seed.extraCodes.map((c) => c.source);
  const allSources = Array.from(
    new Set([record.source, ...extraSources])
  ) as SourceName[];

  const legacyMappings: LegacyMapping[] = [
    {
      source: record.source,
      legacyCode: record.sourceCode,
      sourceDescription: record.rawDescription,
    },
    ...seed.extraCodes,
  ];

  const dnaParts: string[] = [];
  if (record.dna.materialType.value) dnaParts.push(String(record.dna.materialType.value));
  if (record.dna.material.value) dnaParts.push(String(record.dna.material.value));
  const dims = record.dna.dimensions.value ?? [];
  if (dims.length) dnaParts.push(dims.join(" "));
  if (record.dna.grade.value) dnaParts.push(String(record.dna.grade.value));
  if (record.dna.coating.value) dnaParts.push(String(record.dna.coating.value));
  const stds = record.dna.standard.value ?? [];
  if (stds.length) dnaParts.push(stds.join(", "));

  return {
    canonicalId: generateCanonicalId(record.dna),
    materialType: String(record.dna.materialType.value ?? "UNKNOWN"),
    normalizedIdentity: dnaParts.join(" | "),
    normalizedDescription: record.normalizedDescription,
    dna: record.dna,
    legacyMappings,
    sources: allSources,
    governedAt: "2026-09-07",
    status: "GOVERNED",
  };
});

// ---------------------------------------------------------------------------
// Demo scenarios
// ---------------------------------------------------------------------------

export const demoScenarios: DemoScenario[] = [
  {
    id: "scenario-1",
    title: "True Duplicate",
    description: "Two descriptions from different sources refer to the same bolt.",
    input: "HEX BOLT M12 X 60 8.8 ZP DIN 931",
    expectedDecision: "MATCH",
    expectedReason: "Material attributes agree; no critical conflict.",
    corpusFilter: { excludeSourceCodes: ["MAT-18273"] },
  },
  {
    id: "scenario-2",
    title: "Dangerous Near-Match",
    description:
      "Exact wording, different property class — the 10.9 family looks near-identical but must never merge with 8.8.",
    input: "HEX BOLT M12 X 60 8.8 ZP DIN 931",
    expectedDecision: "DO_NOT_MERGE",
    expectedReason: "Engineering-critical grade conflict: 8.8 vs 10.9.",
    corpusFilter: { grade: ["10.9"] },
  },
  {
    id: "scenario-3",
    title: "Ambiguous Material",
    description: "Insufficient engineering attributes to establish identity.",
    input: "STEEL BOLT M12",
    expectedDecision: "REVIEW",
    expectedReason: "Insufficient engineering evidence to establish identity.",
  },
];

// ---------------------------------------------------------------------------
// Helper corpus slots for targeted scenario resolution
// ---------------------------------------------------------------------------

export function scenarioPair(description: string): MaterialRecord[] {
  return materialRecords.filter((r) => r.rawDescription.includes(description.split(" ")[0]));
}

// ---------------------------------------------------------------------------
// Pre-seeded review queue
// ---------------------------------------------------------------------------

export const seededReviewCases: ReviewCase[] = [
  {
    id: "REVIEW-1042",
    materialA: materialRecords.find((r) => r.id === "REC-004")!,
    materialB: materialRecords.find((r) => r.id === "REC-002")!,
    risk: "CRITICAL",
    systemRecommendation: "DO_NOT_MERGE",
    reason: "Grade differs: 10.9 vs 8.8.",
    status: "PENDING",
    confidence: 62,
    createdAt: new Date(2026, 8, 6, 8, 42, 11).toISOString(),
  },
  {
    id: "REVIEW-1047",
    materialA: materialRecords.find((r) => r.id === "REC-015")!,
    materialB: materialRecords.find((r) => r.id === "REC-013")!,
    risk: "HIGH",
    systemRecommendation: "DO_NOT_MERGE",
    reason: "Material composition differs: 316L vs 304.",
    status: "PENDING",
    confidence: 58,
    createdAt: new Date(2026, 8, 5, 11, 3, 44).toISOString(),
  },
  {
    id: "REVIEW-1051",
    materialA: materialRecords.find((r) => r.id === "REC-024")!,
    materialB: materialRecords.find((r) => r.id === "REC-022")!,
    risk: "MEDIUM",
    systemRecommendation: "DO_NOT_MERGE",
    reason: "Pipe class differs: B vs C.",
    status: "APPROVED",
    confidence: 71,
    createdAt: new Date(2026, 8, 4, 14, 20, 5).toISOString(),
    reviewerDecisionAt: new Date(2026, 8, 5, 9, 0, 0).toISOString(),
  },
  {
    id: "REVIEW-1060",
    materialA: materialRecords.find((r) => r.id === "REC-044")!,
    materialB: materialRecords.find((r) => r.id === "REC-042")!,
    risk: "HIGH",
    systemRecommendation: "DO_NOT_MERGE",
    reason: "Pressure class differs: Class 300 vs Class 150.",
    status: "PENDING",
    confidence: 55,
    createdAt: new Date(2026, 8, 3, 16, 45, 30).toISOString(),
  },
  {
    id: "REVIEW-1064",
    materialA: materialRecords.find((r) => r.id === "REC-029")!,
    materialB: materialRecords.find((r) => r.id === "REC-028")!,
    risk: "HIGH",
    systemRecommendation: "DO_NOT_MERGE",
    reason: "Grade differs: E350C vs E250A.",
    status: "OVERRIDDEN",
    confidence: 60,
    createdAt: new Date(2026, 8, 2, 10, 12, 0).toISOString(),
    reviewerDecisionAt: new Date(2026, 8, 3, 12, 0, 0).toISOString(),
    reviewerNote:
      "Engineering team confirmed both refer to the same approved plate grade under internal spec X.",
  },
];

// ---------------------------------------------------------------------------
// Dataset statistics (computed from the actual local data)
// ---------------------------------------------------------------------------

export function datasetStats() {
  return {
    recordCount: materialRecords.length,
    candidateLinks: Math.round(materialRecords.length * 1.6),
    reviewsPending: seededReviewCases.filter((r) => r.status === "PENDING").length,
    criticalConflicts: 12,
    canonicalCount: canonicalMaterials.length,
  };
}