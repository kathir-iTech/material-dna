import { History } from "lucide-react";
import type { AuditEvent } from "@/types/domain";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export function AuditTimeline({
  events,
  versions,
}: {
  events: AuditEvent[];
  versions: { engine: string; parser: string; constraints: string };
}) {
  return (
    <Card>
      <CardHeader
        title="Audit Trail"
        subtitle="Every resolution produces an inspectable, versioned evidence trail."
        right={<History size={15} className="text-dna-cyan" />}
      />
      <CardBody>
        <ol className="relative space-y-2 border-l border-dna-border pl-4">
          {events.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full border border-dna-cyan bg-dna-bg" aria-hidden />
              <div className="flex flex-wrap items-baseline gap-x-2">
                <code className="font-mono text-[11px] text-dna-faint">{e.at}</code>
                <span className="text-sm text-dna-text">{e.label}</span>
                {e.detail && (
                  <span className="font-mono text-[11px] text-dna-muted">{e.detail}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-4 border-t border-dna-border pt-3 font-mono text-[11px] text-dna-faint">
          <span>Engine: {versions.engine}</span>
          <span>Parser: {versions.parser}</span>
          <span>Constraints: {versions.constraints}</span>
        </div>
      </CardBody>
    </Card>
  );
}