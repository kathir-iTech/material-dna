import fs from "node:fs";
import crypto from "node:crypto";
import { parseCsv } from "@/lib/migration/parse";
import { describe, expect, it } from "vitest";
import {
  additionalConstraints,
  resolveWithReviewPolicy,
} from "@/lib/material-dna/matching/review-first";
import {
  buildInputRecord,
  resolveMaterialRecord,
} from "@/lib/material-dna/demo";
import report from "../benchmark/review-first-results.json";

describe("additional engineering specifications", () => {
  const cases = [
    [
      "Operating pressure",
      "Steel pressure gauge 0-12 bar SS304",
      "Steel pressure gauge 0-18 bar SS304",
    ],
    ["Angle", "SS304 elbow 40mm 45 degrees", "SS304 elbow 40mm 90 degrees"],
    [
      "Mesh rating",
      "Stainless strainer 30 mesh 40mm",
      "Stainless strainer 60 mesh 40mm",
    ],
    ["Hardness", "Tool steel HRC 45 20mm", "Tool steel HRC 55 20mm"],
    [
      "Manufacturing process",
      "SS304 seamless pipe 40mm SCH40",
      "SS304 ERW pipe 40mm SCH40",
    ],
    [
      "Actuation",
      "SS304 ball valve 40mm manual",
      "SS304 ball valve 40mm pneumatic",
    ],
    ["Polymer composition", "PTFE seal 20mm", "Nitrile seal 20mm"],
    [
      "Numeric pressure class",
      "FRP pipe 80mm class 4 pressure",
      "FRP pipe 80mm class 6 pressure",
    ],
    ["End connection", "SS304 valve 40mm wafer", "SS304 valve 40mm lug"],
    [
      "Flow passage",
      "SS304 valve 40mm full port",
      "SS304 valve 40mm reduced bore",
    ],
    [
      "Actuator geometry",
      "Limit switch roller lever IP65 5A",
      "Limit switch plunger IP65 5A",
    ],
    ["Material condition", "PTFE rod 20mm virgin", "PTFE rod 20mm filled"],
    [
      "Shore hardness",
      "Silicone sheet 50 Shore A 3mm",
      "Silicone sheet 80 Shore A 3mm",
    ],
  ];
  it.each(cases)("detects %s independently of similarity", (label, a, b) => {
    const found = additionalConstraints(a, b).find(
      (c) => c.attributeLabel === label,
    );
    expect(found?.status).toBe("CONFLICT");
    const input = buildInputRecord(a),
      candidate = { ...buildInputRecord(b), id: "REFERENCE" };
    const result = resolveWithReviewPolicy(input, [candidate], () => 100);
    expect(result.decision).toBe("DO_NOT_MERGE");
    expect(
      result.selectedCandidate?.criticalConflicts.some(
        (c) => c.attributeLabel === label,
      ),
    ).toBe(true);
  });
  it("normalizes supported units and wording without inventing a conflict", () => {
    expect(
      additionalConstraints(
        "SS304 valve full port 1 MPa seamless",
        "SS304 valve full bore 10 bar SMLS",
      ),
    ).toEqual([]);
    expect(
      additionalConstraints(
        "silicone 60 Shore A sheet",
        "silicone Shore A 60 sheet",
      ),
    ).toEqual([]);
  });
  it("marks a one-sided specification as unknown, not an invented mismatch", () => {
    const c = additionalConstraints(
      "SS304 valve 40mm manual",
      "SS304 valve 40mm",
    );
    expect(c.find((x) => x.attributeLabel === "Actuation")?.status).toBe(
      "UNKNOWN",
    );
    expect(c.some((x) => x.status === "CONFLICT")).toBe(false);
  });
  it("retains the submitted configuration when explicitly selected", () => {
    const a = buildInputRecord("Butterfly valve 150mm wafer type EPDM seat"),
      b = {
        ...buildInputRecord("Butterfly valve 150mm lug type EPDM seat"),
        id: "REF",
      };
    expect(resolveWithReviewPolicy(a, [b], null, false).decision).toBe(
      resolveMaterialRecord(a, [b]).decision,
    );
    expect(resolveWithReviewPolicy(a, [b]).decision).toBe("DO_NOT_MERGE");
  });
  it("uses distinct reference identity when descriptions are identical", () => {
    const a = buildInputRecord("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    expect(resolveWithReviewPolicy(a, [{ ...a, id: "REF" }]).decision).toBe(
      "MATCH",
    );
  });
  it("reproduces every published policy decision from its fingerprinted dataset", () => {
    const text = fs.readFileSync(report.dataset, "utf8");
    expect(crypto.createHash("sha256").update(text).digest("hex")).toBe(
      report.datasetSha256,
    );
    const [head, ...rows] = parseCsv(text);
    for (const row of rows.filter((r) => r.length >= head.length)) {
      const id = row[head.indexOf("pair_id")],
        a = buildInputRecord(row[head.indexOf("cpse_a_description")]),
        b = {
          ...buildInputRecord(row[head.indexOf("cpse_b_description")]),
          id: `REF-${id}`,
        };
      expect(resolveWithReviewPolicy(a, [b]).decision, `pair ${id}`).toBe(
        report.reviewFirst.results.find((r) => r.id === id)?.decision,
      );
    }
  });
  it("publishes internally consistent policy totals and explicit limitations", () => {
    for (const run of [report.submittedLexical, report.reviewFirst]) {
      expect(Object.values(run.counts).reduce((a, b) => a + b, 0)).toBe(200);
      expect(run.tp + run.fp).toBe(run.counts.MATCH);
      expect(run.results).toHaveLength(200);
    }
    expect(report.scope).toContain("not independent validation");
  });
});
