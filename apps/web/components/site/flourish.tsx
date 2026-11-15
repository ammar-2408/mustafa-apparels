// Hand-drawn decoration for the home hero, Shop by Fabric and the menu (docs/design.md §4).
// Purely decorative: hidden from screen readers, drawn inline (no file to download), brand tokens
// only. The `sway` class (motion.css) moves a sprig on desktop; the drawings themselves never change.

type Props = { className?: string };

const join = (...names: (string | undefined)[]) => names.filter(Boolean).join(' ');

// One five-petal blossom: white petals with a grey-green edge and an orange centre.
function Blossom({ x, y, r, turn = 0 }: { x: number; y: number; r: number; turn?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy={-r * 0.55}
          rx={r * 0.42}
          ry={r * 0.6}
          transform={`rotate(${angle})`}
          className="fill-bg stroke-border-strong"
          strokeWidth="0.8"
        />
      ))}
      <circle r={r * 0.2} className="fill-accent-text" />
    </g>
  );
}

function Leaf({ x, y, turn }: { x: number; y: number; turn: number }) {
  return (
    <path
      d="M0 0c4-6 12-8 18-6-3 6-10 9-18 6z"
      transform={`translate(${x} ${y}) rotate(${turn})`}
      className="fill-primary stroke-border-strong"
      strokeWidth="0.6"
    />
  );
}

// A flowering sprig that grows in from the top-right corner. Its stem starts at the top right,
// so it sways from there (transform-origin in motion.css). Mirror it with -scale-x-100.
export function FlowerSprig({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 160"
      fill="none"
      className={join('pointer-events-none', className)}
    >
      <path
        d="M200 8c-40 6-78 26-108 56-22 22-38 52-52 88M128 30c-6-10-16-16-28-18M86 70c-14-4-26-2-38 6"
        className="stroke-border-strong"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <Leaf x={168} y={14} turn={160} />
      <Leaf x={140} y={26} turn={-20} />
      <Leaf x={112} y={44} turn={150} />
      <Leaf x={70} y={88} turn={-40} />
      <Leaf x={58} y={108} turn={120} />
      <Blossom x={150} y={20} r={16} turn={10} />
      <Blossom x={100} y={12} r={11} turn={30} />
      <Blossom x={96} y={56} r={14} turn={-12} />
      <Blossom x={48} y={76} r={10} turn={20} />
      <Blossom x={56} y={112} r={13} turn={5} />
      <Blossom x={38} y={146} r={8} turn={40} />
    </svg>
  );
}

// A small lotus between two thin lines, above a section heading.
export function LotusOrnament({ className }: Props) {
  return (
    <span aria-hidden="true" className={join('flex items-center justify-center gap-3', className)}>
      <span className="h-px w-12 bg-border-strong" />
      <svg viewBox="0 0 24 24" fill="none" className="size-7 text-accent-text">
        <path
          d="M12 4c2.6 3 3.4 7.5 0 13-3.4-5.5-2.6-10 0-13zM12 17c-2-4.5-5.5-7-9-7 .5 4.5 4 7 9 7zM12 17c2-4.5 5.5-7 9-7-.5 4.5-4 7-9 7z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <span className="h-px w-12 bg-border-strong" />
    </span>
  );
}

// A brush stroke under a heading: thick in the middle, tapering at both ends.
export function Swash({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 12"
      fill="none"
      preserveAspectRatio="none"
      className={join('text-accent-text', className)}
    >
      <path d="M2 9C40 3 100 1 158 5c-50 0-104 3-156 6z" fill="currentColor" />
    </svg>
  );
}

// A soft wave along the bottom of a section, in pale powder blue (or powder blue with `fill-primary`).
export function Wave({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={join('pointer-events-none fill-surface-soft', className)}
    >
      <path d="M0 64c180-40 360-52 560-20s380 60 560 32 240-56 320-60v104H0z" />
    </svg>
  );
}

// A leafy branch in thin grey-green lines, for section corners.
export function LeafBranch({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 140"
      fill="none"
      className={join('pointer-events-none stroke-border-strong', className)}
    >
      <path d="M8 132C60 100 120 58 192 8" strokeWidth="1.2" strokeLinecap="round" />
      {(
        [
          [40, 110, -50],
          [70, 90, -40],
          [100, 70, -45],
          [130, 50, -35],
          [160, 30, -40],
        ] as const
      ).map(([x, y, turn]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path
            d="M0 0c6-14 20-22 34-20-4 14-18 22-34 20z"
            transform={`rotate(${turn})`}
            strokeWidth="1"
          />
          <path
            d="M0 0c-14-4-22-16-20-30 12 2 22 14 20 30z"
            transform={`rotate(${turn + 40})`}
            strokeWidth="1"
          />
        </g>
      ))}
    </svg>
  );
}

// The small heading above a section title: a lotus, then the label between two thin lines.
export function Eyebrow({
  label,
  align = 'center',
}: {
  label: string;
  align?: 'center' | 'start';
}) {
  return (
    <div
      className={join('flex flex-col gap-2', align === 'start' ? 'items-start' : 'items-center')}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-7 text-accent-text">
        <path
          d="M12 4c2.6 3 3.4 7.5 0 13-3.4-5.5-2.6-10 0-13zM12 17c-2-4.5-5.5-7-9-7 .5 4.5 4 7 9 7zM12 17c2-4.5 5.5-7 9-7-.5 4.5-4 7-9 7z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <p className="flex items-center gap-4 caps-tight sm:caps">
        <span aria-hidden="true" className="h-px w-6 bg-fg sm:w-16" />
        {label}
        <span aria-hidden="true" className="h-px w-6 bg-fg sm:w-16" />
      </p>
    </div>
  );
}
