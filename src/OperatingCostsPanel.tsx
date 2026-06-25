import { useState } from "react";
import { CoinIcon, CurrencyDisplay } from "./CurrencyDisplay";
import { ArcanePanel, arcaneButtonGhostClass } from "./arcane-ui";
import { calcMonthlyOperatingCostFromWeekly, newOperatingCostLine, sumOperatingCostLines } from "./mineLogic";
import type { OperatingCostLine } from "./types";

const fieldClass =
  "w-full rounded border border-brass/40 bg-panel px-2 py-1.5 text-sm text-brass-light outline-none focus:border-brass";

function CostRow({ label, valueGp }: { label: string; valueGp: number }) {
  return (
    <div className="flex justify-between gap-4 border-b border-brass/10 py-1.5 text-sm">
      <span className="text-parchment-dark">{label}</span>
      <CurrencyDisplay amountGp={valueGp} size="sm" className="text-brass-light shrink-0" />
    </div>
  );
}

function EditableCostLine({
  line,
  onChange,
  onRemove,
  canRemove,
}: {
  line: OperatingCostLine;
  onChange: (next: OperatingCostLine) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-brass/10 py-2">
      <input
        type="text"
        value={line.label}
        onChange={(e) => onChange({ ...line, label: e.target.value })}
        className={`${fieldClass} min-w-[8rem] flex-1`}
        aria-label="Expense label"
      />
      <input
        type="number"
        min={0}
        step={0.01}
        value={line.amountGp}
        onChange={(e) =>
          onChange({ ...line, amountGp: Math.max(0, Number(e.target.value) || 0) })
        }
        className={`${fieldClass} w-24 tabular-nums`}
        aria-label="Amount in gp"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className={`${arcaneButtonGhostClass} h-9 w-9 shrink-0 px-0 text-lg leading-none disabled:opacity-30`}
        aria-label="Remove expense"
      >
        −
      </button>
    </div>
  );
}

function CostSection({
  title,
  lines,
  onChange,
  locked,
  editing,
}: {
  title: string;
  lines: OperatingCostLine[];
  onChange: (lines: OperatingCostLine[]) => void;
  locked?: boolean;
  editing: boolean;
}) {
  const total = sumOperatingCostLines(lines);

  const updateLine = (id: string, next: OperatingCostLine) => {
    onChange(lines.map((line) => (line.id === id ? next : line)));
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((line) => line.id !== id));
  };

  const addLine = () => {
    onChange([...lines, newOperatingCostLine()]);
  };

  return (
    <div>
      <p className="mb-1 font-display text-xs text-brass uppercase">{title}</p>
      {editing && !locked ? (
        <>
          {lines.map((line) => (
            <EditableCostLine
              key={line.id}
              line={line}
              onChange={(next) => updateLine(line.id, next)}
              onRemove={() => removeLine(line.id)}
              canRemove={lines.length > 1}
            />
          ))}
          <button
            type="button"
            onClick={addLine}
            className={`${arcaneButtonGhostClass} mt-2 w-full py-1.5 text-xs`}
          >
            + Add line
          </button>
        </>
      ) : (
        lines.map((line) => <CostRow key={line.id} label={line.label} valueGp={line.amountGp} />)
      )}
      <div className="mt-2 flex justify-between border-t border-brass/30 pt-2 font-semibold text-brass-light">
        <span>{title.includes("Startup") ? "Startup total" : "Section total"}</span>
        <CurrencyDisplay amountGp={total} size="sm" />
      </div>
    </div>
  );
}

interface OperatingCostsPanelProps {
  startupLines: OperatingCostLine[];
  weeklyLines: OperatingCostLine[];
  onStartupLinesChange: (lines: OperatingCostLine[]) => void;
  onWeeklyLinesChange: (lines: OperatingCostLine[]) => void;
  startupLocked?: boolean;
}

export default function OperatingCostsPanel({
  startupLines,
  weeklyLines,
  onStartupLinesChange,
  onWeeklyLinesChange,
  startupLocked = false,
}: OperatingCostsPanelProps) {
  const [editing, setEditing] = useState(false);

  const weeklyTotal = sumOperatingCostLines(weeklyLines);
  const monthlyTotal = calcMonthlyOperatingCostFromWeekly(weeklyTotal);

  return (
    <ArcanePanel>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-bold tracking-wider text-brass uppercase">
            Cogspanner &amp; Co. Operating Costs
          </h2>
          <p className="mt-0.5 text-xs text-parchment-dark italic">
            Per DM notes — startup + weekly upkeep
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className={`${arcaneButtonGhostClass} shrink-0 px-3 py-1 text-xs`}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing && (
        <p className="mb-3 text-xs leading-relaxed text-parchment-dark">
          Edit labels and gp amounts. Use + / − to add or drop line items as the mine evolves.
          {startupLocked ? " Startup costs are locked after payment." : ""}
        </p>
      )}

      <CostSection
        title="One-Time Startup"
        lines={startupLines}
        onChange={onStartupLinesChange}
        locked={startupLocked}
        editing={editing}
      />

      <div className="mt-4">
        <CostSection
          title="Weekly Payroll & Supplies"
          lines={weeklyLines}
          onChange={onWeeklyLinesChange}
          editing={editing}
        />
      </div>

      <div className="mt-2 flex justify-between border-t border-brass/30 pt-2 font-semibold text-brass-light">
        <span>Weekly operating</span>
        <CurrencyDisplay amountGp={weeklyTotal} size="sm" />
      </div>
      <div className="mt-1 flex justify-between text-sm text-parchment-dark">
        <span>≈ Monthly</span>
        <CurrencyDisplay amountGp={monthlyTotal} size="sm" />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-brass/20 pt-3 text-[10px] text-parchment-dark">
        {(["pp", "gp", "ep", "sp", "cp"] as const).map((type) => (
          <span key={type} className="inline-flex items-center gap-1">
            <CoinIcon type={type} size={11} />
            {type}
          </span>
        ))}
      </div>
    </ArcanePanel>
  );
}
