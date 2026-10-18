import type { MigrationBatch, ReviewCase } from "@/types/domain";
let storageHealthy = true;
export const isWorkspaceStorageHealthy = () => storageHealthy;
const PREFIX = "material-dna.workspace.v1.";
export function readWorkspace<T>(
  key: string,
  guard: (value: unknown) => value is T,
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const text = localStorage.getItem(PREFIX + key);
    if (!text || text.length > 6_000_000) return null;
    const parsed = JSON.parse(text);
    return parsed?.version === 1 && guard(parsed.data) ? parsed.data : null;
  } catch {
    return null;
  }
}
export function writeWorkspace(key: string, data: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ version: 1, data }));
    storageHealthy = true;
    return true;
  } catch {
    storageHealthy = false;
    window.dispatchEvent(new Event("material-dna:storage-unavailable"));
    return false;
  }
}
export function onWorkspaceChange(key: string, callback: () => void) {
  const listener = (event: StorageEvent) => {
    if (event.key === PREFIX + key || event.key === null) callback();
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
function isRecord(value: unknown): boolean {
  if (
    !object(value) ||
    typeof value.id !== "string" ||
    typeof value.source !== "string" ||
    typeof value.sourceCode !== "string" ||
    typeof value.rawDescription !== "string" ||
    !object(value.dna)
  )
    return false;
  return [
    "materialType",
    "material",
    "grade",
    "dimensions",
    "standard",
    "coating",
    "classPressure",
    "schedule",
    "thread",
    "electrical",
    "quantity",
  ].every((key) => {
    const attr = value.dna as Record<string, unknown>;
    if (!object(attr[key])) return false;
    const v = attr[key].value;
    return (
      v === null ||
      typeof v === "string" ||
      (Array.isArray(v) && v.every((item) => typeof item === "string"))
    );
  });
}
export function isReviewSnapshot(value: unknown): value is ReviewCase[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(
      (c) =>
        object(c) &&
        typeof c.id === "string" &&
        isRecord(c.materialA) &&
        isRecord(c.materialB) &&
        ["PENDING", "APPROVED", "REJECTED", "OVERRIDDEN"].includes(
          String(c.status),
        ) &&
        ["MATCH", "REVIEW", "DO_NOT_MERGE", "NO_MATCH"].includes(
          String(c.systemRecommendation),
        ) &&
        ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(c.risk)) &&
        typeof c.reason === "string" &&
        typeof c.createdAt === "string" &&
        typeof c.confidence === "number" &&
        [c.engineVersion, c.parserVersion, c.constraintVersion].every(
          (v) => v === undefined || typeof v === "string",
        ) &&
        (c.constraints === undefined ||
          (Array.isArray(c.constraints) &&
            c.constraints.every(
              (f: unknown) =>
                object(f) &&
                typeof f.rule === "string" &&
                typeof f.attributeLabel === "string" &&
                typeof f.status === "string" &&
                typeof f.explanation === "string",
            ))) &&
        (c.reviewerNote === undefined || typeof c.reviewerNote === "string") &&
        (c.history === undefined ||
          (Array.isArray(c.history) &&
            c.history.every(
              (h: unknown) =>
                object(h) &&
                typeof h.at === "string" &&
                typeof h.action === "string" &&
                (h.note === undefined || typeof h.note === "string"),
            ))),
    )
  );
}
export function isMigrationSnapshot(value: unknown): value is MigrationBatch[] {
  const status = (v: unknown) =>
    ["UNRESOLVED", "PENDING", "APPROVED", "REJECTED"].includes(String(v));
  const text = (v: unknown) => v === undefined || typeof v === "string";
  return (
    Array.isArray(value) &&
    value.length <= 5 &&
    value.every(
      (b) =>
        object(b) &&
        typeof b.id === "string" &&
        typeof b.fileName === "string" &&
        typeof b.createdAt === "string" &&
        ["IMPORTED", "RESOLVED"].includes(String(b.status)) &&
        Array.isArray(b.errors) &&
        b.errors.every(
          (e: unknown) =>
            object(e) &&
            typeof e.row === "number" &&
            typeof e.error === "string",
        ) &&
        Array.isArray(b.ops) &&
        b.ops.every(
          (op: unknown) =>
            object(op) &&
            typeof op.id === "string" &&
            typeof op.at === "string" &&
            ["APPROVED", "REJECTED"].includes(String(op.action)) &&
            typeof op.rolledBack === "boolean" &&
            text(op.note) &&
            object(op.prev) &&
            Object.values(op.prev).every(status) &&
            Array.isArray(op.rowIds) &&
            op.rowIds.every((id: unknown) => typeof id === "string"),
        ) &&
        Array.isArray(b.auditEvents) &&
        b.auditEvents.every(
          (e: unknown) =>
            object(e) &&
            typeof e.at === "string" &&
            typeof e.label === "string" &&
            text(e.detail),
        ) &&
        Array.isArray(b.rows) &&
        b.rows.length <= 1000 &&
        b.rows.every(
          (r: unknown) =>
            object(r) &&
            typeof r.id === "string" &&
            typeof r.row === "number" &&
            typeof r.description === "string" &&
            typeof r.source === "string" &&
            status(r.status) &&
            text(r.reason) &&
            (r.candidateCode === null || text(r.candidateCode)) &&
            (r.confidence === undefined || typeof r.confidence === "number") &&
            (r.decision === undefined ||
              ["MATCH", "REVIEW", "DO_NOT_MERGE", "NO_MATCH"].includes(
                String(r.decision),
              )) &&
            (r.risk === undefined ||
              ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(r.risk))),
        ),
    )
  );
}
