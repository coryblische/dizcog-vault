/** Renders a Latin letter as its Dethek (Dwarvish) glyph via the Dethek font */

export function DethekGlyph({
  letter,
  className = "",
  size = 32,
}: {
  letter: string;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`font-dethek inline-block leading-none select-none ${className}`}
      style={{ fontSize: size }}
      aria-hidden
    >
      {letter.toUpperCase()}
    </span>
  );
}
