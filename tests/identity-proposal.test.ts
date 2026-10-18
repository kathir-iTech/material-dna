import { describe, expect, it } from "vitest";
import { buildInputRecord } from "@/lib/material-dna/demo";
import { resolveWithReviewPolicy } from "@/lib/material-dna/matching/review-first";
import {
  identityProposal,
  proposedMaterialCode,
} from "@/lib/material-dna/identity-proposal";
import { generateCanonicalId } from "@/lib/material-dna/canonical-id";

function pair(a: string, b: string) {
  const input = buildInputRecord(a);
  const target = {
    ...buildInputRecord(b),
    id: "REFERENCE",
    sourceCode: "REFERENCE-001",
  };
  return resolveWithReviewPolicy(input, [target]);
}
const BOLT = "HEX BOLT M12 X 60 8.8 ZP DIN 931";
describe("identity proposals preserve engineering distinctions", () => {
  it("labels identical descriptions without issuing or approving a code", () => {
    const proposal = identityProposal(pair(BOLT, BOLT));
    expect(proposal.relationship).toBe("Identical");
    expect(proposal.status).toBe("PROPOSED");
    expect(proposal.requiresHumanApproval).toBe(true);
    expect(proposal.proposedCommonCode).toBe(proposal.referenceCode);
  });
  it.each(["  ", "\t", "\n"])(
    "preserves equivalent values and original evidence across separator %j",
    (separator) => {
      const result = pair(BOLT, BOLT.replaceAll(" ", separator));
      expect(identityProposal(result).relationship).toBe("Duplicate");
      const target = result.selectedCandidate!.targetRecord;
      expect(target.dna.standard.value).toEqual(["DIN 931"]);
      expect(target.dna.materialType.value).toBe("Hex Bolt");
      expect(target.dna.materialType.evidence?.span).toBe(
        `HEX${separator}BOLT`,
      );
    },
  );
  it.each([
    [
      "Butterfly valve 150mm wafer type EPDM seat",
      "Butterfly valve 150mm lug type EPDM seat",
    ],
    ["Ball valve 50mm manual SS304", "Ball valve 50mm pneumatic SS304"],
    ["Steel pipe 50mm seamless", "Steel pipe 50mm welded"],
    ["Air hose 20mm 10bar", "Air hose 20mm 20bar"],
  ])(
    "keeps explicit critical specifications in separate proposals: %s",
    (a, b) => {
      const result = pair(a, b),
        proposal = identityProposal(result);
      expect(result.decision).toBe("DO_NOT_MERGE");
      expect(proposal.relationship).toBe("Conflicting");
      expect(proposal.proposedCommonCode).toBeNull();
      expect(proposal.inputCode).not.toBe(proposal.referenceCode);
    },
  );
  it("is stable and retains the submitted generator as its own version", () => {
    const record = buildInputRecord(BOLT);
    expect(proposedMaterialCode(record)).toBe(proposedMaterialCode(record));
    expect(proposedMaterialCode(record)).toMatch(
      /^MDNA-(?:[^-]+-){4}[0-9A-F]{8}$/,
    );
    expect(generateCanonicalId(record.dna)).toMatch(/-[0-9A-F]{4}$/);
  });
  it("does not invent a common identity without a candidate", () => {
    const result = resolveWithReviewPolicy(buildInputRecord("BOLT"), []);
    const proposal = identityProposal(result);
    expect(proposal.relationship).toBe("Unresolved");
    expect(proposal.proposedCommonCode).toBeNull();
    expect(proposal.referenceCode).toBeNull();
  });
});
