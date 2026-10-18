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
  Layers3,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const NAV = [
  {
    href: "/",
    label: "Resolve",
    detail: "Material intelligence",
    icon: ScanLine,
  },
  {
    href: "/materials",
    label: "Materials",
    detail: "Canonical master",
    icon: Boxes,
  },
  {
    href: "/graph",
    label: "Identity Graph",
    detail: "Connections & lineage",
    icon: GitBranch,
  },
  {
    href: "/review",
    label: "Review Queue",
    detail: "Human governance",
    icon: ShieldCheck,
  },
  {
    href: "/migrate",
    label: "Bulk Migration",
    detail: "Legacy onboarding",
    icon: FileSpreadsheet,
  },
  {
    href: "/research",
    label: "Research",
    detail: "Evidence & evaluation",
    icon: FlaskConical,
  },
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
            <Dna size={25} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span>
            <strong>
              material<span>dna</span>
              <i>.</i>
            </strong>
            <small>ENGINEERING IDENTITY</small>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-switch-icon">
            <Layers3 aria-hidden="true" size={17} />
          </span>
          <span>
            National Material Master<small>Prototype workspace</small>
          </span>
          <ChevronRight aria-hidden="true" size={13} />
        </div>
        <p className="nav-section">WORKSPACE</p>
        {!presentation && (
          <nav aria-label="Primary">
            {NAV.map(({ href, label, detail, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={pathname === href ? "page" : undefined}
                className={`workspace-nav-link ${pathname === href ? "is-active" : ""}`}
              >
                <Icon aria-hidden="true" size={19} strokeWidth={1.7} />
                <span>
                  {label}
                  <small>{detail}</small>
                </span>
                {pathname === href && <span className="nav-active-dot" />}
              </Link>
            ))}
          </nav>
        )}
        <div className="nav-bottom">
          <div className="nav-principle">
            <ShieldCheck aria-hidden="true" size={21} />
            <strong>
              Similarity is a signal.
              <br />
              Engineering decides.
            </strong>
            <p>Every recommendation comes with evidence.</p>
          </div>
          <a
            href="https://github.com/kathir-iTech/material-dna"
            target="_blank"
            rel="noreferrer"
            className="nav-source"
          >
            Explore the source <ArrowUpRight aria-hidden="true" size={15} />
          </a>
          <div className="nav-team">
            <span>Z6</span>
            <div>
              ZYN6<small>SIH 2026 · PS26099</small>
            </div>
            <span className="status-dot" />
          </div>
        </div>
      </aside>
      <header className="workspace-topbar">
        <div className="breadcrumb">
          <span>Workspace</span>
          <ChevronRight aria-hidden="true" size={13} />
          <strong>{current.label}</strong>
        </div>
        <div className="topbar-actions">
          <Link href="/materials" className="workspace-search">
            <Search aria-hidden="true" size={15} />
            <span>Find a material</span>
          </Link>
          <span className="topbar-prototype">
            <span className="status-dot" />
            Prototype
          </span>
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
            <Sparkles aria-hidden="true" size={15} />
            Present demo
          </Link>
        </div>
      </header>
    </>
  );
}
