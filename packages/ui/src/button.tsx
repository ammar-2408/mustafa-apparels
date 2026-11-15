import type { ComponentProps } from 'react';

// Ink and white (docs/design.md §1.2). Every button ends its hover the same way: ink with white
// text, lifted 2px with a soft shadow (the theme's `lift`). Orange is kept for small accents.
// Spaced capitals tighten on phones so labels don't wrap. The focus ring comes from the theme.
export type ButtonVariant = 'primary' | 'secondary';
/** Spaced capitals (the default), or Bold sentence case for the redesigned home and menu. */
export type ButtonLabel = 'caps' | 'bold';

const BASE =
  'lift inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-8 text-center disabled:pointer-events-none disabled:opacity-50';

const LABELS: Record<ButtonLabel, string> = {
  caps: 'caps-tight sm:caps',
  bold: 'text-body font-bold',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-action bg-action text-action-fg',
  secondary: 'border-action bg-transparent text-fg hover:bg-action hover:text-action-fg',
};

/** Button classes, also for links that act as buttons (WhatsApp, Call, Email). */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  className?: string,
  label: ButtonLabel = 'caps',
) {
  return [BASE, LABELS[label], VARIANTS[variant], className].filter(Boolean).join(' ');
}

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant };

export function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
