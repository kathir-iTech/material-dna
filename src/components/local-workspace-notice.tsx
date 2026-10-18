"use client";
import { isWorkspaceStorageHealthy } from "@/lib/browser-workspace";
import { useEffect, useState } from "react";
import { Database, RotateCcw, TriangleAlert } from "lucide-react";
export function LocalWorkspaceNotice({
  kind,
  onReset,
}: {
  kind: "reviews" | "migrations";
  onReset: () => void;
}) {
  const [available, setAvailable] = useState(isWorkspaceStorageHealthy),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("material-dna.storage-probe", "1");
      localStorage.removeItem("material-dna.storage-probe");
    } catch {
      setAvailable(false);
    }
    const fail = () => setAvailable(false);
    window.addEventListener("material-dna:storage-unavailable", fail);
    return () =>
      window.removeEventListener("material-dna:storage-unavailable", fail);
  }, []);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dna-border bg-white px-4 py-3 text-xs">
      <div className="flex items-start gap-2">
        {available ? (
          <Database
            aria-hidden="true"
            size={15}
            className="mt-0.5 shrink-0 text-dna-cyan"
          />
        ) : (
          <TriangleAlert
            aria-hidden="true"
            size={15}
            className="text-dna-amber"
          />
        )}
        <p>
          <strong className="font-medium">
            {available
              ? "Saved on this browser"
              : "Browser storage unavailable — export before leaving"}
          </strong>
          <span className="mt-1 block text-xs leading-relaxed text-dna-muted">
            {kind === "reviews"
              ? "The latest 100 cases"
              : "The latest 5 batches"}{" "}
            survive refreshes when storage is available. Local demonstration
            state; no shared database or authenticated audit.
          </span>
        </p>
      </div>
      <div className="flex gap-2">
        {confirm && (
          <button
            className="secondary-action"
            onClick={() => setConfirm(false)}
          >
            Keep data
          </button>
        )}
        <button
          className="secondary-action"
          onClick={() => {
            if (confirm) {
              onReset();
              setConfirm(false);
            } else setConfirm(true);
          }}
        >
          <RotateCcw aria-hidden="true" size={12} />
          {confirm ? "Confirm reset" : "Reset demo"}
        </button>
      </div>
    </div>
  );
}
