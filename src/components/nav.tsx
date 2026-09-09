import Link from "next/link";
import { Dna, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { href: "/", label: "Resolve", exact: true },
  { href: "/review", label: "Review Queue" },
  { href: "/materials", label: "Materials" },
  { href: "/graph", label: "Identity Graph" },
  { href: "/research", label: "Research" },
];

export function TopNav({ presentation }: { presentation?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-dna-border bg-dna-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Material DNA home">
          <span className="flex h-7 w-7 items-center justify-center rounded border border-dna-cyan/40 bg-dna-cyan/10 text-dna-cyan">
            <Dna size={16} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-dna-text">
            MATERIAL <span className="text-dna-cyan">DNA</span>
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-dna-faint sm:inline">
            Engineering Material Identity
          </span>
        </Link>

        {!presentation && (
          <nav className="flex items-center gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-2.5 py-1.5 text-xs font-medium text-dna-muted transition-colors hover:bg-dna-panel hover:text-dna-text"
                aria-label={`${item.label} page`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {!presentation && (
            <Badge tone="blue">
              <Presentation size={11} />
              Prototype
            </Badge>
          )}
          <Badge tone="purple">Demo Mode</Badge>
        </div>
      </div>
    </header>
  );
}