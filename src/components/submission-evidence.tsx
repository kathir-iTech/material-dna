import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const CHECKS = [
  [
    "Extract engineering attributes",
    "Working",
    "Inspect normalized values and source evidence.",
    "/",
  ],
  [
    "Block unsafe merges",
    "Working",
    "Run the grade-conflict example and pressure/process comparisons.",
    "/?demo=1",
  ],
  [
    "Propose a traceable material code",
    "Working",
    "Generate a deterministic proposal; retain the original source codes.",
    "/materials",
  ],
  [
    "Human review and reversible batches",
    "Working",
    "CSV/XLSX import, decisions, local history and batch rollback.",
    "/migrate",
  ],
  [
    "Constraint-aware identity clustering",
    "Working",
    "Inspect source links and the links withheld by critical constraints.",
    "/graph",
  ],
  [
    "Submitted fused F1: 0.815",
    "Historical",
    "Recorded 200-pair result; current local validation reproduces lexical scoring.",
    "#submitted-benchmark",
  ],
];

export function SubmissionEvidence() {
  return (
    <section
      className="submission-evidence"
      aria-label="Submission verification checklist"
    >
      <h2>What you can verify</h2>
      <p>
        The submitted presentation is fixed. These checks connect its core
        claims to the working demonstrator.
      </p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Submission claim</th>
              <th>Status</th>
              <th>How to check</th>
            </tr>
          </thead>
          <tbody>
            {CHECKS.map(([claim, status, detail, href]) => (
              <tr key={claim}>
                <td>
                  <Link href={href}>
                    {claim}
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                </td>
                <td>
                  <span
                    className={
                      status === "Working"
                        ? "verification-working"
                        : "verification-historical"
                    }
                  >
                    {status}
                  </span>
                </td>
                <td>{detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="submission-limit">
        Scope: synthetic records, proposed codes and browser-local review
        history. Real CPSE validation, authenticated shared governance, ERP
        integration and national-scale operation are not established by this
        demo.
      </p>
    </section>
  );
}
