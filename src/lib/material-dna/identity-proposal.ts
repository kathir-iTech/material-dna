import type { MaterialRecord, ResolutionResult } from "@/types/domain";
import {
  canonicalAttributeSet,
  fnv1a32,
  generateCanonicalId,
} from "./canonical-id";
import { engineeringFacets } from "./specifications";

/** A proposal namespace, not an issued code or a global uniqueness guarantee. */
export function proposedMaterialCode(record: MaterialRecord): string {
  const specifications = engineeringFacets(record.rawDescription)
    .filter((facet) => facet.values.length)
    .map((facet) => `${facet.key}=${facet.values.join(",")}`)
    .join("|");
  const hash = fnv1a32(`${canonicalAttributeSet(record.dna)}|${specifications}`)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");
  return `${generateCanonicalId(record.dna).split("-").slice(0, -1).join("-")}-${hash}`;
}

export function identityProposal(result: ResolutionResult) {
  const target = result.selectedCandidate?.targetRecord;
  let relationship = "Unresolved";
  let explanation =
    "Insufficient evidence to establish an engineering relationship.";
  if (result.decision === "DO_NOT_MERGE") {
    relationship = "Conflicting";
    explanation =
      "Critical specifications disagree. Keep these records separate.";
  } else if (result.decision === "MATCH" && target) {
    if (result.input.rawDescription.trim() === target.rawDescription.trim()) {
      relationship = "Identical";
      explanation =
        "The descriptions are identical and the matching checks passed.";
    } else if (
      canonicalAttributeSet(result.dna) === canonicalAttributeSet(target.dna)
    ) {
      relationship = "Duplicate";
      explanation =
        "Different descriptions resolve to the same extracted engineering attributes.";
    } else {
      relationship = "Equivalent";
      explanation =
        "The engine recommends compatible specifications; an engineer must confirm equivalence.";
    }
  } else if (target && result.selectedCandidate!.similarityScore >= 65) {
    relationship = "Near-duplicate";
    explanation =
      "Similar descriptions need further engineering evidence before linking.";
  }
  return {
    version: "identity-proposal-v2",
    relationship,
    explanation,
    inputCode: proposedMaterialCode(result.input),
    referenceCode: target ? proposedMaterialCode(target) : null,
    proposedCommonCode:
      result.decision === "MATCH" && target
        ? proposedMaterialCode(target)
        : null,
    status: "PROPOSED",
    requiresHumanApproval: true,
    scope:
      "Not an issued national code. Registry collision checks and engineering approval are required before assignment.",
  };
}
