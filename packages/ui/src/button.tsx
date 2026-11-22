import type { ComponentProps, ReactNode } from 'react';

// Every button but the home hero pair follows the owner's button-template.png (2026-11-22): a
// glossy green pill with a white Bold spaced-capital label and a round white-to-mint button with a
// deep green arrow on the right (docs/brand.md §8). The gloss, the 3D hover (lift, light sweep,
// arrow push) and the press live in packages/config/tailwind/buttons.css (`btn-3d`, `btn-circle`).
// `bg-deep` is the plain colour under the gloss, and what shows if the stylesheet ever fails.
// The focus ring comes from the theme.
export type ButtonVariant = 'primary' | 'secondary' | 'deep' | 'deep-outline';
/** The label style of the home hero pair: spaced capitals, or Bold sentence case. */
export type ButtonLabel = 'caps' | 'bold';

const TEMPLATE =
  'btn-3d inline-flex items-center justify-between gap-4 rounded-full bg-deep text-action-fg py-1.5 pr-2.5 pl-8 text-left text-small font-bold uppercase tracking-[0.18em] sm:text-body disabled:pointer-events-none disabled:opacity-50';

// The home hero's own pair (owner's mockup, 2026-11-15), unchanged by the template.
const HERO_BASE =
  'lift inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-8 text-center disabled:pointer-events-none disabled:opacity-50';

const LABELS: Record<ButtonLabel, string> = {
  caps: 'caps-tight sm:caps',
  bold: 'text-body font-bold',
};

const HERO: Record<'deep' | 'deep-outline', string> = {
  // On hover a colour fills them, closing in from the edge (owner, 2026-11-17): `sweep` in
  // apps/web/app/motion.css, with the fill colour in --sweep.
  deep: 'sweep border-deep bg-deep text-action-fg [--sweep:var(--color-action)]',
  'deep-outline': 'sweep border-deep bg-bg/60 text-deep [--sweep:var(--color-deep)]',
};

/**
 * Button classes, also for links that act as buttons (WhatsApp, Call, Email). A link with the
 * template look ends with `<ButtonCircle />`, like `Button` does.
 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  className?: string,
  label: ButtonLabel = 'caps',
) {
  // 56px tall, unless the caller sets a height to match a field beside it (e.g. min-h-12).
  const height = className && /(^|\s)min-h-/.test(className) ? '' : 'min-h-14';
  const own =
    variant === 'deep' || variant === 'deep-outline'
      ? [HERO_BASE, LABELS[label], HERO[variant]]
      : [TEMPLATE, height];
  return [...own, className].filter(Boolean).join(' ');
}

type CircleProps = {
  /** An icon of the button's own (WhatsApp, phone, mail) instead of the arrow. */
  icon?: ReactNode;
  /** "back" points the arrow left, for Previous. */
  direction?: 'forward' | 'back';
};

/** The round button on the right of every template button. Hidden from screen readers. */
export function ButtonCircle({ icon, direction = 'forward' }: CircleProps) {
  return (
    <span
      aria-hidden="true"
      className="btn-circle flex size-9 shrink-0 items-center justify-center rounded-full bg-bg text-deep [&_svg]:size-5"
    >
      {icon ?? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={direction === 'back' ? 'size-5 rotate-180' : 'size-5'}
        >
          <path
            d="M4 12h16M14 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  /** An icon for the round button on the right, instead of the arrow. */
  icon?: ReactNode;
};

export function Button({
  variant = 'primary',
  type = 'button',
  className,
  icon,
  children,
  ...props
}: ButtonProps) {
  const template = variant === 'primary' || variant === 'secondary';
  return (
    <button type={type} className={buttonClass(variant, className)} {...props}>
      {children}
      {template && <ButtonCircle icon={icon} />}
    </button>
  );
}
