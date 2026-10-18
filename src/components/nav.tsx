"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  Dna,
  FileSpreadsheet,
  FlaskConical,
  GitBranch,
  Play,
  ScanLine,
  Search,
} from "lucide-react";
import { ShieldCheck } from "lucide-react";

const NAV = [
  { href: "/", label: "Resolve", icon: ScanLine },
  { href: "/materials", label: "Materials", icon: Boxes },
  { href: "/graph", label: "Identity Graph", icon: GitBranch },
  { href: "/review", label: "Review Queue", icon: ShieldCheck },
  { href: "/migrate", label: "Bulk Migration", icon: FileSpreadsheet },
  { href: "/research", label: "Research", icon: FlaskConical },
];

export function TopNav({ presentation = false }: { presentation?: boolean }) {
  const pathname = usePathname();
  const current = NAV.find((n) => n.href === pathname) ?? NAV[0];
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="workspace-nav">
        <Link
          href="/"
          className="workspace-brand"
          aria-label="Material DNA home"
        >
          <span className="brand-mark">
            <Dna size={25} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>
            <strong>Material DNA</strong>
            <small>Material standardization</small>
          </span>
        </Link>
        <p className="nav-section">Workspace</p>
        {!presentation && (
          <nav aria-label="Primary">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={pathname === href ? "page" : undefined}
                className={`workspace-nav-link ${pathname === href ? "is-active" : ""}`}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        )}
        <div className="nav-bottom">
          <div className="nav-checklist">
            <p>Designed for engineering review</p>
            <span>
              <ShieldCheck size={15} aria-hidden="true" /> Critical conflicts
              block merges
            </span>
            <span>
              <GitBranch size={15} aria-hidden="true" /> Original codes stay
              traceable
            </span>
          </div>
          <a
            href="https://github.com/kathir-iTech/material-dna"
            target="_blank"
            rel="noreferrer"
            className="nav-source"
          >
            Source & documentation <ArrowUpRight aria-hidden="true" size={14} />
          </a>
          <div className="nav-team">
            <span className="team-avatar">Z6</span>
            <div>
              ZYN6 <small>SIH 2026 · PS26099</small>
            </div>
          </div>
        </div>
      </aside>
      <header className="workspace-topbar">
        <div className="breadcrumb">
          <span>Material workspace</span>
          <ChevronRight aria-hidden="true" size={14} />
          <strong>{current.label}</strong>
        </div>
        <div className="topbar-actions">
          <Link href="/materials" className="workspace-search">
            <Search aria-hidden="true" size={16} />
            <span>Find a material</span>
          </Link>
          <span className="topbar-prototype">Demo workspace</span>
          <Link
            href="/?demo=1"
            className="present-button"
            onClick={(event) => {
              if (
                !event.metaKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey
              )
                window.dispatchEvent(new Event("material-dna:present"));
            }}
          >
            <Play aria-hidden="true" size={14} />
            Present demo
          </Link>
        </div>
      </header>
    </>
  );
}
