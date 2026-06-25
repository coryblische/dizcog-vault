import {
  breakDownGp,
  formatCoinBreakdown,
  type CoinType,
} from "./currency";

const COIN_STYLES: Record<
  CoinType,
  { fill: string; stroke: string; highlight: string; rim: string }
> = {
  cp: {
    fill: "#a85a2a",
    stroke: "#6b3410",
    highlight: "#d4844a",
    rim: "#5c2e0e",
  },
  sp: {
    fill: "#b8c0c8",
    stroke: "#6e7880",
    highlight: "#e8eef4",
    rim: "#5a6268",
  },
  ep: {
    fill: "#b8a060",
    stroke: "#7a6838",
    highlight: "#d8c888",
    rim: "#6a5a30",
  },
  gp: {
    fill: "#d4a82a",
    stroke: "#8b6914",
    highlight: "#f0d060",
    rim: "#7a5a10",
  },
  pp: {
    fill: "#d8e4ec",
    stroke: "#8898a8",
    highlight: "#f4f8fc",
    rim: "#708090",
  },
};

export function CoinIcon({
  type,
  size = 16,
  className = "",
}: {
  type: CoinType;
  size?: number;
  className?: string;
}) {
  const s = COIN_STYLES[type];
  const id = `coin-${type}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`shrink-0 drop-shadow-sm ${className}`}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-face`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor={s.highlight} />
          <stop offset="55%" stopColor={s.fill} />
          <stop offset="100%" stopColor={s.stroke} />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={s.rim} />
      <circle cx="12" cy="12" r="9.5" fill={`url(#${id}-face)`} stroke={s.stroke} strokeWidth="0.8" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={s.stroke} strokeWidth="0.5" opacity="0.45" />
      <ellipse cx="9" cy="8.5" rx="3" ry="1.5" fill="white" opacity="0.22" />
    </svg>
  );
}

const SIZE_MAP = { sm: 12, md: 16, lg: 22 } as const;

export function CurrencyDisplay({
  amountGp,
  size = "md",
  className = "",
  title,
  tooltipAlign = "center",
}: {
  amountGp: number;
  size?: keyof typeof SIZE_MAP;
  className?: string;
  title?: string;
  tooltipAlign?: "start" | "center" | "end";
}) {
  const negative = amountGp < 0;
  const coins = breakDownGp(amountGp);
  const iconSize = SIZE_MAP[size];
  const textSize =
    size === "lg" ? "text-lg" : size === "md" ? "text-sm" : "text-xs";

  const breakdown = title ?? formatCoinBreakdown(amountGp);

  const tooltipPosition =
    tooltipAlign === "end"
      ? "bottom-[calc(100%+6px)] right-0 left-auto translate-x-0"
      : tooltipAlign === "start"
        ? "bottom-[calc(100%+6px)] left-0 translate-x-0"
        : "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2";

  const tooltipArrow =
    tooltipAlign === "end"
      ? "left-auto right-3"
      : tooltipAlign === "start"
        ? "left-3"
        : "left-1/2 -translate-x-1/2";

  return (
    <span
      className={`group/coin relative inline-flex cursor-help flex-wrap items-center gap-x-1.5 gap-y-0.5 ${textSize} ${className} ${
        negative ? "text-red-400" : ""
      }`}
      title={breakdown}
    >
      {negative && <span className="font-semibold">−</span>}
      {coins.map(({ type, count }) => (
        <span key={type} className="inline-flex items-center gap-0.5">
          <span className="font-semibold tabular-nums">{count}</span>
          <CoinIcon type={type} size={iconSize} />
        </span>
      ))}

      <span
        role="tooltip"
        className={`pointer-events-none absolute z-[100] w-max max-w-[min(18rem,calc(100vw-2rem))] rounded border border-brass/50 bg-panel px-2.5 py-1.5 text-center text-xs leading-snug whitespace-normal text-parchment opacity-0 shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-opacity duration-150 group-hover/coin:opacity-100 ${tooltipPosition}`}
      >
        {breakdown}
        <span
          className={`absolute top-full border-4 border-transparent border-t-brass/50 ${tooltipArrow}`}
        />
      </span>
    </span>
  );
}
