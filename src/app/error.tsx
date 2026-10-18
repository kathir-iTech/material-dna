"use client";

import Link from "next/link";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24" role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">
        The workspace could not load
      </h1>
      <p className="my-5 text-sm leading-7 text-dna-muted">
        Try loading this view again. If the problem continues, return to
        Resolve. Previously saved browser data is retained.
      </p>
      <div className="flex flex-wrap gap-3">
        <button className="primary-action" onClick={reset}>
          Try again
        </button>
        <Link className="secondary-action" href="/">
          Return to Resolve
        </Link>
      </div>
    </main>
  );
}
