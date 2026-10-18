"use client";
import { useState } from "react";
import { Calculator } from "lucide-react";
import { Card, CardBody, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
export function ImpactSimulator() {
  const [records, setRecords] = useState(10000),
    [duplicatePct, setDuplicatePct] = useState(10),
    [value, setValue] = useState(5000),
    [carrying, setCarrying] = useState(18);
  const capital = ((records * duplicatePct) / 100) * value,
    annual = (capital * carrying) / 100;
  const money = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Calculator aria-hidden="true" size={15} />
            Pilot value calculator
          </span>
        }
        subtitle="Make assumptions explicit before making a business case."
        right={<Badge tone="amber">SCENARIO · NOT MEASURED SAVINGS</Badge>}
      />
      <CardBody>
        <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "Material records",
                value: records,
                set: setRecords,
                max: 10000000,
              },
              {
                label: "Avoidable stock lines (%)",
                value: duplicatePct,
                set: setDuplicatePct,
                max: 100,
              },
              {
                label: "Stock value per line (₹)",
                value,
                set: setValue,
                max: 100000000,
              },
              {
                label: "Annual holding cost (%)",
                value: carrying,
                set: setCarrying,
                max: 100,
              },
            ].map((f) => (
              <label key={f.label} className="text-[10px] text-dna-muted">
                {f.label}
                <input
                  type="number"
                  min={0}
                  max={f.max}
                  value={f.value}
                  onChange={(e) =>
                    f.set(
                      Math.min(f.max, Math.max(0, Number(e.target.value) || 0)),
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-dna-border bg-dna-panel2 px-3 py-2 text-sm text-dna-text"
                />
              </label>
            ))}
          </div>
          <div className="rounded-xl border border-[#c7e2d5] bg-[#f0f8f3] p-5">
            <p className="text-[10px] text-[#456856]">
              Illustrative annual holding-cost opportunity
            </p>
            <p
              className="mt-2 break-all text-3xl font-semibold tracking-tight text-[#226e53]"
              aria-live="polite"
            >
              {money(annual)}
            </p>
            <p className="mt-3 text-[10px] leading-6 text-[#456856]">
              {records.toLocaleString("en-IN")} lines × {duplicatePct}%
              avoidable stock × {money(value)} per line × {carrying}% holding
              cost.
            </p>
          </div>
        </div>
        <p className="mt-4 text-[10px] leading-6 text-dna-muted">
          Duplicate codes alone do not prove redundant stock. This illustration
          assumes the selected stock lines are genuinely avoidable and capital
          can be released. Validate inventory, service levels, approved
          equivalence, implementation cost and adoption in a real pilot.
        </p>
      </CardBody>
    </Card>
  );
}
