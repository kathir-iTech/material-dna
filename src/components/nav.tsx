"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dna, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { href: "/", label: "Resolve", exact: true },
  { href: "/review", label: "Review Queue" },
  { href: "/migrate", label: "Bulk Migration" },
  { href: "/materials", label: "Materials" },
  { href: "/graph", label: "Identity Graph" },
  { href: "/research", label: "Research" },
];

export function TopNav({ presentation }: { presentation?: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-dna-border bg-dna-bg/90 backdrop-blur">
      {/* min-w-0 + overflow-x-auto on the nav keeps the six links scrollable
          inside the bar on narrow screens instead of widening the document. */}
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Material DNA home"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded border border-dna-cyan/40 bg-dna-cyan/10 text-dna-cyan">
            <Dna size={16} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-dna-text">
            MATERIAL <span className="text-dna-cyan">DNA</span>
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-dna-faint sm:inline">
            Engineering Material Identity
          </span>
        </Link>

        {!presentation && (
          <nav
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain"
            aria-label="Primary"
          >
            {NAV.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-dna-cyan/10 text-dna-cyan"
                      : "text-dna-muted hover:bg-dna-panel hover:text-dna-text",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {!presentation && (
            <Badge tone="blue">
              <Presentation size={11} aria-hidden="true" />
              Prototype
            </Badge>
          )}
          <Badge tone="purple">Demo Mode</Badge>
        </div>
      </div>
    </header>
  );
}