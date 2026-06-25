/** Artificer arcane-copper UI — gears, filigree, conjured sparks */

function FiligreeCorner({
  className = "",
  mirror = "none",
}: {
  className?: string;
  mirror?: "x" | "y" | "xy" | "none";
}) {
  const transform =
    mirror === "x"
      ? "scale(-1, 1)"
      : mirror === "y"
        ? "scale(1, -1)"
        : mirror === "xy"
          ? "scale(-1, -1)"
          : undefined;

  return (
    <svg
      viewBox="0 0 56 56"
      className={`h-9 w-9 ${className}`}
      fill="none"
      aria-hidden
    >
      <g transform={transform ? `translate(56,56) ${transform} translate(-56,-56)` : undefined}>
        <path
          d="M2 54 C2 30 14 10 54 2"
          stroke="currentColor"
          strokeWidth="1.4"
          className="text-copper-light/70"
        />
        <path
          d="M6 50 C10 34 30 12 50 8"
          stroke="currentColor"
          strokeWidth="0.9"
          className="text-copper/50"
        />
        <path
          d="M12 44 C16 30 28 16 44 12"
          stroke="currentColor"
          strokeWidth="0.6"
          className="text-arcane/40"
        />
        <circle cx="14" cy="42" r="3.5" stroke="currentColor" strokeWidth="0.9" className="text-copper-light/60" />
        <circle cx="14" cy="42" r="1.2" fill="currentColor" className="text-arcane/50" />
        <path
          d="M14 38 Q22 26 34 14"
          stroke="currentColor"
          strokeWidth="0.7"
          className="text-copper/45"
        />
        <circle cx="28" cy="28" r="2" stroke="currentColor" strokeWidth="0.7" className="text-arcane/55" />
        <path
          d="M26 48 Q38 38 48 26"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-copper/35"
        />
        <path d="M4 52 L10 46 M8 54 L14 48" stroke="currentColor" strokeWidth="0.5" className="text-copper/40" />
      </g>
    </svg>
  );
}

function CogGear({
  size = 64,
  className = "",
  teeth = 10,
  hole = 0.35,
  style,
}: {
  size?: number;
  className?: string;
  teeth?: number;
  hole?: number;
  style?: React.CSSProperties;
}) {
  const cx = 24;
  const cy = 24;
  const outer = 20;
  const inner = outer * hole;
  const toothDepth = 3.2;

  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = ((i + 0.35) / teeth) * Math.PI * 2;
    const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
    const a3 = ((i + 0.85) / teeth) * Math.PI * 2;

    const rOut = outer + toothDepth;
    const rIn = outer - 1;

    points.push(
      `${cx + Math.cos(a0) * rIn},${cy + Math.sin(a0) * rIn}`,
      `${cx + Math.cos(a1) * rOut},${cy + Math.sin(a1) * rOut}`,
      `${cx + Math.cos(a2) * rOut},${cy + Math.sin(a2) * rOut}`,
      `${cx + Math.cos(a3) * rIn},${cy + Math.sin(a3) * rIn}`,
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      fill="currentColor"
      style={style}
      aria-hidden
    >
      <polygon points={points.join(" ")} opacity="0.85" />
      <circle cx={cx} cy={cy} r={inner} fill="#0a0908" />
      <circle cx={cx} cy={cy} r={inner * 0.55} fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

function ArcaneBolt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 80" className={className} fill="none" aria-hidden>
      <path
        d="M26 0 L14 34 H22 L10 80 L34 30 H24 Z"
        fill="currentColor"
        className="text-arcane-light/30"
      />
      <path
        d="M24 4 L16 32 H22 L14 72 L30 28 H22 Z"
        fill="currentColor"
        className="text-arcane-light/60 animate-arcane-flicker"
      />
    </svg>
  );
}

function PowerPort({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <div className="h-full w-full rounded-full border border-copper/40 bg-panel-light shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]" />
      <div className="absolute inset-[22%] rounded-full bg-arcane/30 animate-arcane-core" />
      <div className="absolute inset-[32%] rounded-full bg-arcane-light/50 blur-[2px]" />
    </div>
  );
}

const GEAR_PLACEMENTS: Array<{
  size: number;
  spin: string;
  opacity: string;
  teeth: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}> = [
  { size: 140, top: "6%", left: "-3%", spin: "animate-gear-drift", opacity: "opacity-[0.1]", teeth: 12 },
  { size: 88, top: "18%", right: "4%", spin: "animate-gear-drift-reverse", opacity: "opacity-[0.12]", teeth: 10 },
  { size: 200, bottom: "8%", right: "-6%", spin: "animate-gear-drift", opacity: "opacity-[0.07]", teeth: 16 },
  { size: 72, bottom: "22%", left: "6%", spin: "animate-gear-drift-reverse", opacity: "opacity-[0.11]", teeth: 8 },
  { size: 52, top: "42%", left: "3%", spin: "animate-gear-drift", opacity: "opacity-[0.09]", teeth: 8 },
  { size: 44, top: "55%", right: "12%", spin: "animate-gear-drift-reverse", opacity: "opacity-[0.1]", teeth: 6 },
];

export function ArcaneBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="arcane-aurora absolute inset-0" />

      {/* mine interior */}
      <div
        className="arcane-backdrop-mine absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/mine-interior.png)" }}
      />
      <div className="arcane-backdrop-veil absolute inset-0" />
      <div className="arcane-backdrop-accent absolute inset-0" />

      <svg className="absolute inset-0 h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="arcane-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
            <circle cx="24" cy="24" r="1.5" fill="#b87333" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#arcane-grid)" />
      </svg>

      {/* workshop pipes */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05]" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 120 H280 M0 120 V200 M280 120 V80 M280 80 H420" stroke="#b87333" strokeWidth="3" fill="none" />
        <path d="M1200 480 H840 M840 480 V320 M840 320 H660" stroke="#7a4f24" strokeWidth="2.5" fill="none" />
        <circle cx="280" cy="120" r="8" stroke="#b87333" strokeWidth="2" fill="none" />
        <circle cx="840" cy="480" r="6" stroke="#b87333" strokeWidth="1.5" fill="none" />
      </svg>

      {GEAR_PLACEMENTS.map((g, i) => (
        <CogGear
          key={i}
          size={g.size}
          teeth={g.teeth}
          className={`absolute text-copper/80 ${g.opacity} ${g.spin}`}
          style={{ top: g.top, left: g.left, right: g.right, bottom: g.bottom }}
        />
      ))}

      <ArcaneBolt className="absolute top-[28%] left-[14%] h-16 w-10 opacity-50" />
      <ArcaneBolt className="absolute right-[18%] bottom-[30%] h-20 w-12 rotate-12 opacity-35 [animation-delay:0.8s]" />
      <PowerPort className="absolute top-[24%] right-[22%] h-10 w-10" />
      <PowerPort className="absolute bottom-[28%] left-[18%] h-8 w-8 [animation-delay:1.2s]" />

      <div className="animate-arcane-pulse absolute top-[12%] left-[8%] h-32 w-32 rounded-full bg-arcane/8 blur-3xl" />
      <div className="animate-arcane-pulse absolute right-[10%] bottom-[18%] h-40 w-40 rounded-full bg-copper/10 blur-3xl [animation-delay:1.5s]" />
      <div className="absolute top-1/2 left-1/2 h-px w-[min(80vw,600px)] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-arcane/20 to-transparent" />
    </div>
  );
}

export function ArcaneSigil({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <CogGear
        size={size}
        teeth={12}
        className="absolute text-copper/50 animate-gear-drift-reverse"
      />
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 48 48"
        className="relative z-10"
        fill="none"
        aria-hidden
      >
        <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1" className="text-arcane/70" />
        <path
          d="M24 10 L27 20 L38 24 L27 28 L24 38 L21 28 L10 24 L21 20 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          className="text-arcane-light/80"
        />
        <circle cx="24" cy="24" r="4" fill="currentColor" className="text-arcane-light animate-arcane-core" />
        <path d="M24 4 V8 M24 40 V44 M4 24 H8 M40 24 H44" stroke="currentColor" strokeWidth="1" className="text-copper/50" />
      </svg>
    </div>
  );
}

export function ArcanePanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-visible rounded-md border border-copper/50 bg-panel/88 shadow-[inset_0_1px_0_rgba(184,115,51,0.2),0_0_28px_rgba(0,229,255,0.06),0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-[2px] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(0,229,255,0.04)_0%,transparent_40%,rgba(184,115,51,0.06)_100%)]" />

      {/* riveted border accents */}
      <div className="pointer-events-none absolute top-2.5 right-12 left-12 flex justify-between">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1.5 w-1.5 rounded-full bg-copper/30 shadow-[inset_0_0_2px_rgba(0,0,0,0.8)]" />
        ))}
      </div>

      <FiligreeCorner className="pointer-events-none absolute top-1 left-1 text-copper-light" />
      <FiligreeCorner className="pointer-events-none absolute top-1 right-1 text-copper-light" mirror="x" />
      <FiligreeCorner className="pointer-events-none absolute bottom-1 left-1 text-copper-light" mirror="y" />
      <FiligreeCorner className="pointer-events-none absolute right-1 bottom-1 text-copper-light" mirror="xy" />

      <div className="relative px-5 pt-6 pb-5">{children}</div>
    </div>
  );
}

export const arcaneButtonClass =
  "rounded border border-copper/60 bg-gradient-to-b from-copper/40 to-panel-light px-6 py-3 font-display text-sm font-bold tracking-wider text-parchment uppercase shadow-[0_0_16px_rgba(0,229,255,0.1),inset_0_1px_0_rgba(184,115,51,0.25)] transition hover:border-arcane/50 hover:from-copper/55 hover:shadow-[0_0_22px_rgba(0,229,255,0.22)] disabled:cursor-not-allowed disabled:opacity-40";

export const arcaneButtonGhostClass =
  "rounded border border-copper/30 bg-panel-light/80 px-4 py-3 font-display text-xs tracking-wider text-parchment-dark uppercase transition hover:border-arcane/40 hover:text-parchment hover:shadow-[0_0_12px_rgba(0,229,255,0.12)]";
