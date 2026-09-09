import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import {
  FlaskConical,
  Percent,
  Target,
  TriangleAlert,
  Goal,
  Network,
  Table2,
} from "lucide-react";

const EXPERIMENTAL: Record<string, "EXPERIMENTAL" | "PROTOTYPE" | "PROPOSED" | "FUTURE"> = {
  experimental: "EXPERIMENTAL",
  prototype: "PROTOTYPE",
  proposed: "PROPOSED",
  future: "FUTURE",
};

const SIGNALS: Record<string, { tone: "blue" | "cyan" | "amber" | "purple" | "green"; label: string }> = {
  EXPERIMENTAL: { tone: "blue", label: "EXPERIMENTAL" },
  PROTOTYPE: { tone: "cyan", label: "PROTOTYPE" },
  PROPOSED: { tone: "purple", label: "PROPOSED" },
  FUTURE: { tone: "amber", label: "FUTURE" },
};

const CAPABILITY_TABLE: Array<{ capability: string; status: string }> = [
  { capability: "Material attribute extraction", status: "Prototype implemented" },
  { capability: "Candidate matching", status: "Prototype implemented" },
  { capability: "Constraint engine", status: "Prototype implemented" },
  { capability: "Evidence panel", status: "Implemented" },
  { capability: "Review workflow", status: "Demo implemented" },
  { capability: "Canonical identities", status: "Demo implemented" },
  { capability: "Identity graph", status: "Demo implemented" },
  { capability: "Real CPSE data", status: "Not available" },
  { capability: "SAP integration", status: "Future" },
  { capability: "National-scale deployment", status: "Future" },
  { capability: "Learned production model", status: "Future" },
];

export default function ResearchClient() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-dna-text">Validation & Research</h1>
          <p className="mt-1 max-w-3xl text-sm text-dna-muted">
            Prototype experiments, adversarial demonstration data, and the honest validation roadmap.
          </p>
        </div>
        <DemoBadge />
      </div>

      <p className="max-w-3xl rounded border border-dna-purple/40 bg-dna-purple/5 px-4 py-3 text-xs text-dna-muted">
        Demonstration values are synthetic and do not represent confidential CPSE records.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Prototype experiments */}
        <Card>
          <CardHeader
            title="Prototype Experiments"
            subtitle="Baseline evidence, not CPSE production accuracy."
            right={<FlaskConical size={15} className="text-dna-cyan" />}
          />
          <CardBody className="space-y-3">
            <div className="rounded border border-dna-border bg-dna-panel2 p-3">
              <div className="flex items-center justify-between">
                <Badge tone="cyan">TF-IDF baseline</Badge>
                <Badge tone="blue">{EXPERIMENTAL.experimental}</Badge>
              </div>
              <div className="mt-2 space-y-1 text-xs text-dna-muted">
                <p><span className="text-dna-faint">Dataset:</span> Abt-Buy product entity-resolution benchmark</p>
                <p><span className="text-dna-faint">Purpose:</span> Establish a lexical baseline.</p>
                <p><span className="text-dna-faint">Result:</span> TF-IDF P@10 = 1.000, but recall drops sharply (R@200 = 0.170) — a retrieval gap.</p>
                <p className="mt-1 text-[11px] text-dna-faint">
                  Limitation: e-commerce benchmark, not CPSE material data. Used as baseline evidence rather than production material accuracy.
                </p>
              </div>
            </div>

            <div className="rounded border border-dna-border bg-dna-panel2 p-3">
              <div className="flex items-center justify-between">
                <Badge tone="cyan">Quantity extraction</Badge>
                <Badge tone="blue">{EXPERIMENTAL.experimental}</Badge>
              </div>
              <div className="mt-2 space-y-1 text-xs text-dna-muted">
                <p><span className="text-dna-faint">Dataset:</span> Prototype local material descriptions</p>
                <p><span className="text-dna-faint">Purpose:</span> Measure unit-aware quantity detection coverage.</p>
                <p>
                  <Percent size={11} className="inline text-dna-cyan" />{" "}
                  <span className="font-mono text-dna-text">102 / 109</span>{" "}
                  <span className="font-mono text-dna-cyan">93.6%</span>
                  <span className="text-[11px] text-dna-faint"> — prototype local quantity-detection coverage</span>
                </p>
                <p className="mt-1 text-[11px] text-dna-faint">
                  Limitation: unit-aware parsing requires engineering-domain interpretation; raw quantity parsers can misinterpret identifiers, grades and standard numbers.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Adversarial benchmark */}
        <Card>
          <CardHeader
            title="Adversarial Material Benchmark"
            subtitle="200 team-created labelled demonstration pairs."
            right={<Target size={15} className="text-dna-cyan" />}
          />
          <CardBody className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="green">100 match</Badge>
              <Badge tone="red">100 non-match</Badge>
              <Badge tone="purple">{EXPERIMENTAL.prototype}</Badge>
            </div>
            <p className="text-sm text-dna-muted">
              Designed to stress near-miss patterns that generic lexical matching gets wrong:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "word reorder",
                "size difference",
                "grade difference",
                "abbreviation",
                "material substitution",
                "standard difference",
                "dimension changes",
              ].map((c) => (
                <Badge key={c} tone="neutral" className="font-mono">{c}</Badge>
              ))}
            </div>
            <p className="text-[11px] text-dna-faint">
              Designed as an adversarial demonstration suite; not a statistically representative CPSE benchmark.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* What remains to be validated */}
      <Card>
        <CardHeader
          title="What remains to be validated?"
          subtitle="A serious engineering team knows what remains unproven."
          right={<TriangleAlert size={15} className="text-dna-amber" />}
        />
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Real CPSE material data",
              "Cross-organization ontology alignment",
              "Real engineering equivalence decisions",
              "Large-scale performance",
              "ERP integration",
              "Domain-specific standards mapping",
              "Human reviewer agreement",
              "Production security",
              "Data governance",
            ].map((item) => (
              <div key={item} className="rounded border border-dna-border bg-dna-panel2 px-3 py-2 text-xs text-dna-muted">
                {item}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* What makes Material DNA different */}
      <Card>
        <CardHeader
          title="What Makes Material DNA Different?"
          subtitle="Engineering-aware identity."
          right={<Goal size={15} className="text-dna-cyan" />}
        />
        <CardBody className="space-y-3">
          <h3 className="text-base font-semibold text-dna-text">
            Match records without ignoring engineering reality.
          </h3>
          <p className="max-w-3xl text-sm text-dna-muted">
            Generic entity resolution can identify likely relationships. Material DNA adds a
            domain-specific decision layer where engineering-critical conflicts can prevent an
            unsafe merge.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Engineering attribute extraction",
              "Critical constraint validation",
              "Evidence-backed decisions",
              "Risk-aware abstention",
              "Legacy-to-canonical mapping",
              "Human governance",
              "Versionable material identity",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded border border-dna-border bg-dna-panel2 px-3 py-2 text-xs text-dna-text">
                <span className="h-1.5 w-1.5 rounded-full bg-dna-cyan" />
                {item}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Next-gen architecture */}
      <Card>
        <CardHeader
          title="Constraint-Aware Material Identity Graph"
          subtitle="Proposed next-generation architecture — not deployed at national scale."
          right={<Network size={15} className="text-dna-purple" />}
        />
        <CardBody>
          <div className="flex flex-wrap items-center justify-center gap-1.5 py-2 font-mono text-[11px]">
            {[
              "Material records",
              "Extracted attributes",
              "Evidence",
              "Candidate links",
              "Constraints",
              "Canonical identities",
              "Legacy mappings",
            ].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-1.5">
                <span className="rounded border border-dna-border2 bg-dna-panel2 px-2 py-1 text-dna-text">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-dna-faint">→</span>}
              </div>
            ))}
          </div>
          <p className="mt-3 max-w-3xl text-sm text-dna-muted">
            Candidate links are probabilistic. Critical incompatibilities are explicit constraints.
            Canonical identities are promoted only when evidence and constraints support the
            relationship.
          </p>
        </CardBody>
      </Card>

      {/* Capability status */}
      <Card>
        <CardHeader
          title="Implemented vs Proposed vs Future"
          subtitle="Explicit capability status for reviewers."
          right={<Table2 size={15} className="text-dna-cyan" />}
        />
        <CardBody className="p-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dna-border text-[11px] uppercase tracking-wider text-dna-faint">
                <th className="px-4 py-2 font-medium">Capability</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_TABLE.map((row) => {
                const key = row.status.split(" ")[0].toUpperCase();
                const signal = SIGNALS[key] ?? SIGNALS.PROTOTYPE;
                return (
                  <tr key={row.capability} className="border-b border-dna-border/50">
                    <td className="px-4 py-2 text-dna-text">{row.capability}</td>
                    <td className="px-4 py-2">
                      <Badge tone={signal.tone}>{signal.label}</Badge>
                      <span className="ml-2 text-dna-muted">{row.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}