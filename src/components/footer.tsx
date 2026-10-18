import { ShieldCheck, ArrowUpRight } from "lucide-react";
export function Footer() {
  return (
    <footer className="workspace-footer">
      <span>
        <ShieldCheck aria-hidden="true" size={14} />
        Engineering evidence. Human oversight.
      </span>
      <span>Synthetic demonstration data · Proposed identifiers</span>
      <a
        href="https://github.com/kathir-iTech/material-dna"
        target="_blank"
        rel="noreferrer"
      >
        ZYN6 / SIH26099 <ArrowUpRight aria-hidden="true" size={13} />
      </a>
    </footer>
  );
}
