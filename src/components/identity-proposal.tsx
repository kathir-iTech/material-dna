import { Fingerprint } from "lucide-react";
import type { ResolutionResult } from "@/types/domain";
import { identityProposal } from "@/lib/material-dna/identity-proposal";

export function IdentityProposal({ result }: { result: ResolutionResult }) {
  const identity = identityProposal(result);
  return (
    <section className="identity-proposal" aria-label="Material code proposal">
      <div className="identity-proposal-heading">
        <Fingerprint size={18} aria-hidden="true" />
        <div>
          <h3>{identity.relationship}</h3>
          <p>{identity.explanation}</p>
        </div>
      </div>
      {identity.proposedCommonCode ? (
        <div className="proposed-code">
          <span>Proposed common material code</span>
          <code>{identity.proposedCommonCode}</code>
        </div>
      ) : (
        <div className="separate-codes">
          <div className="proposed-code">
            <span>Input identity preview</span>
            <code>{identity.inputCode}</code>
          </div>
          {identity.referenceCode && (
            <div className="proposed-code">
              <span>Reference identity preview</span>
              <code>{identity.referenceCode}</code>
            </div>
          )}
        </div>
      )}
      <p className="proposal-scope">
        Deterministic proposal · Human approval required · Not an issued
        national code
      </p>
    </section>
  );
}
