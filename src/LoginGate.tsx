import { useCallback, useEffect, useMemo, useState } from "react";
import { ArcaneBackdrop, ArcanePanel, ArcaneSigil } from "./arcane-ui";
import { DethekGlyph } from "./dethek-glyphs";
import { login } from "./api";
import { PIN_LENGTH, PINPAD_RUNES, type Rune } from "./runes";
import { SITE_COPY } from "./site-content";

const PINPAD_SETTLE_MS = 1500;
const PINPAD_TICK_MS = 100;

function shuffleRunes(runes: Rune[]): Rune[] {
  const next = [...runes];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function stepPinpadTowardOrder(current: Rune[], target: Rune[]): Rune[] {
  const next = [...current];
  const wrongIndices = next
    .map((rune, index) => (rune.id !== target[index].id ? index : -1))
    .filter((index) => index >= 0);

  if (wrongIndices.length === 0) return next;

  const slot = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
  const targetRune = target[slot];
  const at = next.findIndex((rune) => rune.id === targetRune.id);

  if (at >= 0 && at !== slot) {
    [next[slot], next[at]] = [next[at], next[slot]];
  }

  return next;
}

function RuneButtonParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * 360 + (Math.random() * 20 - 10);
        return {
          angle,
          size: 2.5 + Math.random() * 3.5,
          delay: Math.random() * 0.9,
          duration: 0.85 + Math.random() * 0.75,
          opacity: 0.55 + Math.random() * 0.35,
          start: `${26 + Math.random() * 5}px`,
          end: `${42 + Math.random() * 16}px`,
        };
      }),
    [],
  );

  return (
    <span className="rune-particle-layer pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {particles.map((particle, index) => (
        <span
          key={index}
          className="rune-border-particle absolute top-1/2 left-1/2 rounded-full bg-arcane-light shadow-[0_0_6px_rgba(142,232,255,0.75),0_0_12px_rgba(0,229,255,0.35)]"
          style={{
            width: particle.size,
            height: particle.size,
            marginLeft: -particle.size / 2,
            marginTop: -particle.size / 2,
            ["--particle-angle" as string]: `${particle.angle}deg`,
            ["--particle-start" as string]: particle.start,
            ["--particle-end" as string]: particle.end,
            ["--particle-delay" as string]: `${particle.delay}s`,
            ["--particle-duration" as string]: `${particle.duration}s`,
            ["--particle-opacity" as string]: String(particle.opacity),
          }}
        />
      ))}
    </span>
  );
}

function PinSlots({ sequence, shake }: { sequence: string[]; shake: boolean }) {
  return (
    <div className={`flex justify-center gap-1 ${shake ? "animate-pin-shake" : ""}`}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => {
        const runeId = sequence[i];
        return (
          <div
            key={i}
            className={`flex h-12 w-9 items-center justify-center rounded border transition-all duration-200 ${
              runeId
                ? "border-arcane/50 bg-arcane/10 text-arcane-light shadow-[0_0_14px_rgba(0,229,255,0.3)]"
                : "border-copper/30 bg-panel text-parchment-dark/30 shadow-[inset_0_0_6px_rgba(0,0,0,0.4)]"
            }`}
          >
            {runeId ? (
              <DethekGlyph letter={runeId} size={22} className="text-arcane-light" />
            ) : (
              <span className="text-parchment-dark/30">·</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RuneButton({
  rune,
  onPress,
  disabled,
  settling,
}: {
  rune: Rune;
  onPress: (rune: Rune) => void;
  disabled: boolean;
  settling: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onPress(rune)}
      disabled={disabled}
      className={`group relative flex items-center justify-center overflow-visible rounded border border-copper/40 bg-gradient-to-b from-panel-light to-panel px-1 py-2.5 transition hover:border-arcane/50 hover:shadow-[0_0_14px_rgba(94,184,212,0.2)] active:scale-95 disabled:cursor-not-allowed disabled:hover:border-copper/40 disabled:hover:shadow-none ${
        settling ? "pointer-events-none opacity-85" : ""
      }`}
      aria-label="Dethek rune"
    >
      <RuneButtonParticles />
      <DethekGlyph
        key={rune.id}
        letter={rune.id}
        size={28}
        className={`relative z-10 text-copper-light transition group-hover:text-arcane-light group-hover:drop-shadow-[0_0_8px_rgba(142,232,255,0.7)] ${
          settling ? "animate-rune-glyph-settle" : ""
        }`}
      />
    </button>
  );
}

export default function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [padReady, setPadReady] = useState(false);
  const [displayRunes, setDisplayRunes] = useState<Rune[]>(() => shuffleRunes(PINPAD_RUNES));

  useEffect(() => {
    void document.fonts.load('28px "Dethek"');
  }, []);

  useEffect(() => {
    let cancelled = false;
    let current = shuffleRunes(PINPAD_RUNES);
    setDisplayRunes(current);
    setPadReady(false);

    const tickCount = Math.floor(PINPAD_SETTLE_MS / PINPAD_TICK_MS);
    let tick = 0;

    const intervalId = window.setInterval(() => {
      if (cancelled) return;

      tick += 1;

      if (tick >= tickCount) {
        setDisplayRunes([...PINPAD_RUNES]);
        setPadReady(true);
        window.clearInterval(intervalId);
        return;
      }

      const progress = tick / tickCount;
      const swaps = progress < 0.5 ? 2 : 1;

      for (let i = 0; i < swaps; i++) {
        current = stepPinpadTowardOrder(current, PINPAD_RUNES);
      }

      setDisplayRunes([...current]);
    }, PINPAD_TICK_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const submitSequence = useCallback(
    async (ids: string[]) => {
      setLoading(true);
      setError(null);

      const result = await login(ids.join(""));
      setLoading(false);

      if (result.ok) {
        onSuccess();
        return;
      }

      setError(result.error ?? "Wrong rune sequence");
      setShake(true);
      setSequence([]);
      window.setTimeout(() => setShake(false), 500);
    },
    [onSuccess],
  );

  const pressRune = useCallback(
    (rune: Rune) => {
      if (loading || !padReady) return;

      setError(null);
      setSequence((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = [...prev, rune.id];
        if (next.length === PIN_LENGTH) {
          void submitSequence(next);
        }
        return next;
      });
    },
    [loading, padReady, submitSequence],
  );

  const backspace = useCallback(() => {
    if (loading || !padReady) return;
    setError(null);
    setSequence((prev) => prev.slice(0, -1));
  }, [loading, padReady]);

  const clearAll = useCallback(() => {
    if (loading || !padReady) return;
    setError(null);
    setSequence([]);
  }, [loading, padReady]);

  const padDisabled = loading || !padReady;
  const runePadLocked = loading || !padReady;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <ArcaneBackdrop />

      <ArcanePanel className="relative z-10 w-full max-w-sm">
        <div className="text-center">
          <ArcaneSigil size={44} className="mx-auto mb-3 text-copper-light" />
          <h1 className="font-display text-2xl font-bold tracking-widest text-copper-light">
            {SITE_COPY.companyName}
          </h1>
          <p className="mt-1 font-display text-xs tracking-[0.25em] text-arcane uppercase">
            {SITE_COPY.vaultTitle}
          </p>
          <p className="mt-3 text-sm text-parchment-dark italic">
            {SITE_COPY.loginBlurb}
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <PinSlots sequence={sequence} shake={shake} />

          <div className="grid grid-cols-4 gap-2 overflow-visible">
            {displayRunes.map((rune, slotIndex) => (
              <RuneButton
                key={slotIndex}
                rune={rune}
                onPress={pressRune}
                disabled={loading}
                settling={runePadLocked}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={backspace}
              disabled={padDisabled || sequence.length === 0}
              className="flex-1 rounded border border-copper/30 bg-panel-light px-3 py-2 font-display text-xs tracking-wider text-parchment-dark uppercase transition hover:border-arcane/40 hover:text-parchment disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={padDisabled || sequence.length === 0}
              className="flex-1 rounded border border-copper/30 bg-panel-light px-3 py-2 font-display text-xs tracking-wider text-parchment-dark uppercase transition hover:border-arcane/40 hover:text-parchment disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          {loading && (
            <p className="text-center font-display text-xs tracking-widest text-arcane uppercase">
              Attuning vault…
            </p>
          )}
        </div>
      </ArcanePanel>
    </div>
  );
}
