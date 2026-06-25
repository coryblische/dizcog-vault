import { useCallback, useState } from "react";
import { CoinIcon, CurrencyDisplay } from "./CurrencyDisplay";
import {
  COIN_ORDER,
  coinsToGp,
  emptyCoinCounts,
  type CoinType,
} from "./currency";
import { arcaneButtonClass } from "./arcane-ui";

const COIN_INPUT_CLASS =
  "w-full rounded border border-brass/40 bg-panel px-2 py-1.5 text-sm text-brass-light outline-none focus:border-brass tabular-nums";

interface InfuseCapitalFormProps {
  onInfuse: (amountGp: number) => void;
  compact?: boolean;
}

export function InfuseCapitalForm({ onInfuse, compact = false }: InfuseCapitalFormProps) {
  const [counts, setCounts] = useState(emptyCoinCounts);

  const previewGp = coinsToGp(counts);
  const hasAmount = previewGp > 0;

  const setCoin = useCallback((type: CoinType, value: number) => {
    setCounts((prev) => ({ ...prev, [type]: Math.max(0, value) }));
  }, []);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!hasAmount) return;
      onInfuse(previewGp);
      setCounts(emptyCoinCounts());
    },
    [hasAmount, onInfuse, previewGp],
  );

  return (
    <form onSubmit={submit} className={compact ? "mt-4" : "mt-4 border-t border-brass/20 pt-4"}>
      <h3
        className={`font-display font-bold tracking-wider text-brass uppercase ${
          compact ? "mb-2 text-xs" : "mb-3 text-sm"
        }`}
      >
        Infuse Capital
      </h3>
      {!compact && (
        <p className="mb-3 text-xs text-parchment-dark italic">
          Transfer coin from proprietor holdings into the company treasury.
        </p>
      )}
      <div className={`grid grid-cols-5 gap-2 ${compact ? "mb-3" : "mb-4"}`}>
        {COIN_ORDER.map((type) => (
          <label key={type} className="block text-center text-xs">
            <span className="mb-1 flex items-center justify-center gap-0.5 text-parchment-dark uppercase">
              <CoinIcon type={type} size={compact ? 10 : 11} />
              {type}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={counts[type] || ""}
              placeholder="0"
              onChange={(e) => setCoin(type, Number(e.target.value) || 0)}
              className={COIN_INPUT_CLASS}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-parchment-dark">
          Adding:{" "}
          {hasAmount ? (
            <CurrencyDisplay amountGp={previewGp} size="sm" className="inline-flex text-brass-light" />
          ) : (
            <span className="text-parchment-dark/50">—</span>
          )}
        </span>
        <button type="submit" disabled={!hasAmount} className={`${arcaneButtonClass} px-4 py-2 text-xs`}>
          Infuse
        </button>
      </div>
    </form>
  );
}
