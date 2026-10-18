import Link from "next/link";
import { ArrowUpRight, FlaskConical, ShieldCheck } from "lucide-react";
import report from "../../benchmark/review-first-results.json";
import { Card, CardBody, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
export function PolicyEvaluation() {
  const a = report.submittedLexical,
    b = report.reviewFirst;
  const rows = [
    ["False MATCH recommendations", a.fp, b.fp],
    ["Correct MATCH recommendations", a.tp, b.tp],
    ["Sent to REVIEW", a.counts.REVIEW, b.counts.REVIEW],
    [
      "MATCH precision",
      (a.precision * 100).toFixed(1) + "%",
      (b.precision * 100).toFixed(1) + "%",
    ],
    [
      "Automatic true-match coverage",
      (a.automaticTrueMatchCoverage * 100).toFixed(1) + "%",
      (b.automaticTrueMatchCoverage * 100).toFixed(1) + "%",
    ],
    ["F1 on decided pairs", a.f1.toFixed(3), b.f1.toFixed(3)],
  ];
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck
              aria-hidden="true"
              size={16}
              className="text-dna-cyan"
            />
            Additional specification screening
          </span>
        }
        subtitle="A measured development comparison. Same 200 synthetic pairs; lexical scoring in both runs."
        right={<Badge tone="cyan">{report.policy}</Badge>}
      />
      <CardBody className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-dna-green/20 bg-dna-green/5 p-4">
            <p className="text-xs text-dna-muted">
              False MATCH recommendations
            </p>
            <p className="mt-2 text-3xl font-semibold text-dna-green">
              {a.fp} <span className="mx-2 text-lg text-dna-faint">→</span>{" "}
              {b.fp}
            </p>
            <p className="mt-2 text-xs leading-5 text-dna-muted">
              On this known regression set. Not a universal safety claim.
            </p>
          </div>
          <div className="rounded-lg border border-dna-border p-4">
            <p className="text-xs text-dna-muted">
              Automatic true-match coverage
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {(b.automaticTrueMatchCoverage * 100).toFixed(0)}
              <span className="text-lg">%</span>
            </p>
            <p className="mt-2 text-xs leading-5 text-dna-muted">
              {b.tp} of 100 true matches accepted. Review workload is part of
              the trade-off.
            </p>
          </div>
          <div className="rounded-lg border border-dna-border p-4">
            <p className="text-xs text-dna-muted">Abstention rate</p>
            <p className="mt-2 text-3xl font-semibold">
              {(b.abstention * 100).toFixed(0)}
              <span className="text-lg">%</span>
            </p>
            <p className="mt-2 text-xs leading-5 text-dna-muted">
              {b.counts.REVIEW} of 200 pairs routed to human review.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr>
                <th className="px-3 py-3">Measure</th>
                <th className="px-3 py-3">Submitted lexical engine</th>
                <th className="px-3 py-3 text-dna-cyan">
                  + Additional specification checks
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, left, right]) => (
                <tr key={String(label)} className="border-b border-dna-border">
                  <td className="px-3 py-3 text-dna-muted">{label}</td>
                  <td className="px-3 py-3 font-mono">{left}</td>
                  <td className="px-3 py-3 font-mono">{right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rounded-lg border border-dna-amber/20 bg-dna-amber/5 p-3 text-xs leading-6 text-dna-muted">
          <FlaskConical
            aria-hidden="true"
            size={13}
            className="mr-1 inline text-dna-amber"
          />
          {report.scope} Checks were developed after inspecting errors on this
          dataset. These results cannot establish generalisation. The fixed
          PPT’s fused F1 0.815 remains the historical submitted result, shown
          separately below.
        </p>
        <details className="text-xs">
          <summary className="cursor-pointer text-dna-cyan">
            Inspect reproducibility & dataset fingerprint
          </summary>
          <div className="mt-3 space-y-2 rounded-lg border border-dna-border bg-dna-panel2 p-4">
            <p>
              Run: <code>npm run evaluate:policy</code>
            </p>
            <p className="break-all">
              Dataset SHA-256: <code>{report.datasetSha256}</code>
            </p>
            <p>
              Labels: team-authored synthetic pairs. Independent domain-expert
              labels and a source-disjoint holdout remain outstanding.
            </p>
            <Link
              href="https://github.com/kathir-iTech/material-dna/tree/main/benchmark"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-dna-cyan"
            >
              Inspect benchmark source{" "}
              <ArrowUpRight aria-hidden="true" size={12} />
            </Link>
          </div>
        </details>
      </CardBody>
    </Card>
  );
}
