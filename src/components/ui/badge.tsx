import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "amber" | "blue" | "cyan" | "purple";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-dna-border2 text-dna-muted bg-transparent",
    green: "border-dna-green/40 bg-dna-green/10 text-dna-green",
    red: "border-dna-red/40 bg-dna-red/10 text-dna-red",
    amber: "border-dna-amber/40 bg-dna-amber/10 text-dna-amber",
    blue: "border-dna-blue/40 bg-dna-blue/10 text-dna-blue",
    cyan: "border-dna-cyan/40 bg-dna-cyan/10 text-dna-cyan",
    purple: "border-dna-purple/40 bg-dna-purple/10 text-dna-purple",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-tight",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function DemoBadge() {
  return <Badge tone="purple">DEMO DATA</Badge>;
}