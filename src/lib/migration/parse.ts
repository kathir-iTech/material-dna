import * as XLSX from "xlsx";
import type { MigrationParseError } from "@/types/domain";
import { MAX_BATCH_ROWS, MAX_DESCRIPTION_LENGTH, MAX_FILE_BYTES } from "./limits";

// ---------------------------------------------------------------------------
// File parsing for bulk migration. Server-side only (imports `xlsx`); used by
// /api/migrate/parse. Supports the two formats a real migration lands on:
//   - .csv   (RFC 4180: quotes, escaped quotes, embedded commas/newlines, BOM)
//   - .xlsx  (first worksheet, first row treated as the header)
//
// Required header: a description column. Recognised (case/space/underscore
// insensitive): description, material description, raw description,
// material, item, name, text, desc. Optional source column: source,
// source system, system, origin.
// ---------------------------------------------------------------------------

export interface ParsedMigrationRow {
  row: number;
  source: string;
  description: string;
}

export type MigrationFileResult =
  | {
      ok: true;
      rows: ParsedMigrationRow[];
      errors: MigrationParseError[];
      truncated: boolean;
    }
  | { ok: false; error: string };

const DESC_HEADERS = new Set([
  "description",
  "material description",
  "raw description",
  "material",
  "item",
  "name",
  "text",
  "desc",
]);

const SOURCE_HEADERS = new Set([
  "source",
  "source system",
  "source code",
  "system",
  "origin",
]);

function normalizeHeader(cell: string): string {
  return cell
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** RFC 4180 CSV state machine. Returns raw string cells per row. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => c.trim().length === 0);
}

/** Shared row extraction for both formats. `matrix` row index = file row - 1. */
export function rowsFromMatrix(matrix: string[][]): MigrationFileResult {
  const headerIndex = matrix.findIndex((r) => !isBlankRow(r));
  if (headerIndex === -1) {
    return { ok: false, error: "File contains no rows." };
  }

  const header = matrix[headerIndex].map(normalizeHeader);
  const descIdx = header.findIndex((h) => DESC_HEADERS.has(h));
  if (descIdx === -1) {
    return {
      ok: false,
      error:
        "No description column found in the header row. Expected a column named e.g. 'description', 'material description', 'material', 'item', 'name' or 'desc'.",
    };
  }
  const sourceIdx = header.findIndex((h) => SOURCE_HEADERS.has(h));

  const rows: ParsedMigrationRow[] = [];
  const errors: MigrationParseError[] = [];
  let truncated = false;

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    if (isBlankRow(cells)) continue;
    const fileRow = i + 1;
    const description = (cells[descIdx] ?? "").trim();

    if (description.length === 0) {
      errors.push({ row: fileRow, error: "Empty description — row skipped." });
      continue;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push({
        row: fileRow,
        error: `Description longer than ${MAX_DESCRIPTION_LENGTH} characters — row skipped.`,
      });
      continue;
    }
    if (rows.length >= MAX_BATCH_ROWS) {
      truncated = true;
      continue;
    }
    rows.push({
      row: fileRow,
      source: sourceIdx >= 0 ? (cells[sourceIdx] ?? "").trim() : "",
      description,
    });
  }

  if (rows.length === 0) {
    if (errors.length > 0) {
      return { ok: true, rows, errors, truncated };
    }
    return { ok: false, error: "No data rows found below the header row." };
  }
  return { ok: true, rows, errors, truncated };
}

function isXlsxBuffer(buf: Buffer): boolean {
  // ZIP magic: "PK" + 03 04 (or empty-archive 05 06 / spanned 07 08).
  return (
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)
  );
}

export function parseMigrationFile(
  fileName: string,
  content: Buffer
): MigrationFileResult {
  if (content.length === 0) {
    return { ok: false, error: "File is empty." };
  }
  if (content.length > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `File larger than ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} MB.`,
    };
  }

  const looksLikeXlsx = isXlsxBuffer(content);
  const wantsXlsx = /\.xlsx$/i.test(fileName);

  if (looksLikeXlsx) {
    try {
      const wb = XLSX.read(content, { type: "buffer" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        return { ok: false, error: "Workbook has no worksheets." };
      }
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
        header: 1,
        raw: false,
        defval: "",
        blankrows: true,
      });
      return rowsFromMatrix(
        matrix.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : []))
      );
    } catch {
      return { ok: false, error: "Not a readable .xlsx workbook." };
    }
  }
  if (wantsXlsx) {
    return {
      ok: false,
      error: "File has a .xlsx extension but is not a valid .xlsx workbook.",
    };
  }

  const text = content.toString("utf8");
  if (text.includes("\u0000")) {
    return {
      ok: false,
      error: "Unsupported file format. Upload a .csv or .xlsx file.",
    };
  }
  return rowsFromMatrix(parseCsv(text));
}
