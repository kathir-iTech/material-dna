import { describe, it, expect } from "vitest";
import { csvCell, decisionHtml, resolutionEvidence } from "@/lib/reports";
import {
  buildInputRecord,
  resolveMaterialRecord,
} from "@/lib/material-dna/demo";
describe("exported evidence", () => {
  it.each(['=HYPERLINK("example")', "  +SUM(1,2)", "@cmd", "-cmd", "\t=1+1"])(
    "neutralizes spreadsheet formula input %s",
    (value) => expect(csvCell(value)).toMatch(/^"'/),
  );
  it("escapes source text in printable reports", () => {
    const input = buildInputRecord('<script>alert("x")</script>');
    const result = resolveMaterialRecord(input, []);
    const html = decisionHtml(result);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(resolutionEvidence(result).result.input.rawDescription).toBe(
      input.rawDescription,
    );
    expect(html).toContain("unsigned export");
  });
});
