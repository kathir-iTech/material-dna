import { Dna } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-dna-border bg-dna-panel/50">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-4 text-xs text-dna-muted sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Dna size={13} className="text-dna-cyan" />
          <span className="font-medium text-dna-text">Material DNA</span>
          <span>— SIH26099 Demonstrator</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Engineering-Aware Material Identity</span>
          <span className="font-mono text-dna-faint">Prototype / Demonstration Environment</span>
        </div>
      </div>
    </footer>
  );
}