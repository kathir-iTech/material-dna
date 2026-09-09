import type { MaterialDNA } from "@/types/domain";
import { ListChecks } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 90
      ? "bg-dna-green"
      : value >= 70
        ? "bg-dna-blue"
        : value >= 40
          ? "bg-dna-amber"
          : "bg-dna-muted";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-14 overflow-hidden rounded-full bg-dna-border2">
        <div
          className={color}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-dna-muted">{value}%</span>
    </div>
  );
}

interface RowDef {
  key: keyof MaterialDNA;
  label: string;
  join?: boolean;
}

const ROWS: RowDef[] = [
  { key: "materialType", label: "Material Type" },
  { key: "material", label: "Material" },
  { key: "grade", label: "Grade" },
  { key: "dimensions", label: "Dimensions", join: true },
  { key: "standard", label: "Standard", join: true },
  { key: "coating", label: "Coating" },
  { key: "classPressure", label: "Pressure Class" },
  { key: "schedule", label: "Schedule" },
  { key: "thread", label: "Thread" },
  { key: "electrical", label: "Electrical", join: true },
];

export function MaterialDNAProfile({ dna }: { dna: MaterialDNA }) {
  return (
    <Card>
      <CardHeader
        title="Material DNA"
        subtitle="Structured engineering attributes with extraction evidence"
        right={<Badge tone="cyan">DNA</Badge>}
      />
      <CardBody className="p-0">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-dna-border text-[11px] uppercase tracking-wider text-dna-faint">
              <th className="px-4 py-2 font-medium">Attribute</th>
              <th className="px-2 py-2 font-medium">Value</th>
              <th className="hidden px-2 py-2 font-medium md:table-cell">Confidence</th>
              <th className="hidden px-4 py-2 font-medium md:table-cell">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const attr = dna[row.key] as {
                value: string | string[] | null;
                confidence: number;
                evidence?: { span: string } | null;
              };
              const hasValue =
                attr.value !== null &&
                attr.value !== undefined &&
                (Array.isArray(attr.value) ? attr.value.length > 0 : String(attr.value).length > 0);

              return (
                <tr key={row.key} className="border-b border-dna-border/60">
                  <td className="px-4 py-2 font-medium text-dna-text">{row.label}</td>
                  <td className="px-2 py-2">
                    {hasValue ? (
                      <span className="font-mono text-dna-text">
                        {row.join && Array.isArray(attr.value)
                          ? attr.value.join(", ")
                          : String(attr.value)}
                      </span>
                    ) : (
                      <span className="text-dna-faint italic">—</span>
                    )}
                  </td>
                  <td className="hidden px-2 py-2 md:table-cell">
                    {hasValue ? <ConfidenceBar value={Math.round(attr.confidence * 100)} /> : <span className="text-dna-faint">—</span>}
                  </td>
                  <td className="hidden max-w-56 px-4 py-2 md:table-cell">
                    {hasValue && attr.evidence?.span ? (
                      <span className="truncate font-mono text-[11px] text-dna-cyan">
                        &quot;{attr.evidence.span}&quot;
                      </span>
                    ) : (
                      <span className="text-dna-faint">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-dna-border px-4 py-2 text-xs text-dna-muted">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks size={13} className="text-dna-cyan" />
            Overall extraction confidence
          </span>
          <span className="font-mono text-dna-text">{dna.confidence}%</span>
        </div>
      </CardBody>
    </Card>
  );
}