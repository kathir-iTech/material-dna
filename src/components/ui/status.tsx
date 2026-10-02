import {
  Check,
  X,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  CircleSlash,
} from "lucide-react";
import type { DecisionStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

const DECISION_META: Record<
  DecisionStatus,
  { label: string; icon: React.ReactNode; tone: "green" | "red" | "amber" | "neutral" }
> = {
  MATCH: { label: "MATCH", icon: <Check size={14} strokeWidth={2.5} aria-hidden="true" />, tone: "green" },
  DO_NOT_MERGE: { label: "DO NOT MERGE", icon: <X size={14} strokeWidth={2.5} aria-hidden="true" />, tone: "red" },
  REVIEW: { label: "REVIEW", icon: <AlertTriangle size={14} strokeWidth={2.5} aria-hidden="true" />, tone: "amber" },
  NO_MATCH: { label: "NO MATCH", icon: <CircleSlash size={14} strokeWidth={2.5} aria-hidden="true" />, tone: "neutral" },
};

const STATUS_ICONS = {
  green: <Check size={13} strokeWidth={2.5} className="text-dna-green" aria-hidden="true" />,
  red: <X size={13} strokeWidth={2.5} className="text-dna-red" aria-hidden="true" />,
  amber: <AlertTriangle size={13} strokeWidth={2.5} className="text-dna-amber" aria-hidden="true" />,
  neutral: <ShieldAlert size={13} strokeWidth={2.5} className="text-dna-muted" aria-hidden="true" />,
  unknown: <HelpCircle size={13} strokeWidth={2.5} className="text-dna-muted" aria-hidden="true" />,
};

export function DecisionBadge({ decision, size = "md" }: { decision: DecisionStatus; size?: "sm" | "md" | "lg" }) {
  const meta = DECISION_META[decision];
  const sizes = {
    sm: "px-1.5 py-0.5 text-[11px]",
    md: "px-2 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };
  const tones =
    meta.tone === "green"
      ? "border-dna-green/40 bg-dna-green/10 text-dna-green"
      : meta.tone === "red"
        ? "border-dna-red/40 bg-dna-red/10 text-dna-red"
        : meta.tone === "amber"
          ? "border-dna-amber/40 bg-dna-amber/10 text-dna-amber"
          : "border-dna-border2 text-dna-muted bg-transparent";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border font-mono font-semibold tracking-wide",
        sizes[size],
        tones
      )}
      aria-label={`Decision: ${meta.label}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

export function StatusGlyph({ status }: { status: "PASS" | "WARNING" | "CONFLICT" | "UNKNOWN" }) {
  const icon =
    status === "PASS"
      ? STATUS_ICONS.green
      : status === "CONFLICT"
        ? STATUS_ICONS.red
        : status === "WARNING"
          ? STATUS_ICONS.amber
          : STATUS_ICONS.unknown;
  const label =
    status === "PASS"
      ? "Compatible"
      : status === "CONFLICT"
        ? "Critical conflict"
        : status === "WARNING"
          ? "Warning"
          : "Unknown";

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-dna-text">
      {icon}
      <span className="text-dna-muted">{label}</span>
    </span>
  );
}

export function RiskBadge({ risk, label }: { risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; label?: string }) {
  const meta = {
    LOW: { tone: "border-dna-green/40 text-dna-green bg-dna-green/10" as const, icon: STATUS_ICONS.green },
    MEDIUM: { tone: "border-dna-blue/40 text-dna-blue bg-dna-blue/10" as const, icon: STATUS_ICONS.amber },
    HIGH: { tone: "border-dna-amber/40 text-dna-amber bg-dna-amber/10" as const, icon: STATUS_ICONS.amber },
    CRITICAL: { tone: "border-dna-red/40 text-dna-red bg-dna-red/10" as const, icon: STATUS_ICONS.red },
  }[risk];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px]", meta.tone)}>
      {meta.icon}
      {label ? <>{label}: {risk}</> : risk}
    </span>
  );
}