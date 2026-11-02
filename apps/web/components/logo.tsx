import Image from 'next/image';
import Link from 'next/link';

// The logo pack's files, used as they are (docs/design.md §1.3).
export type LogoVariant = 'primary' | 'secondary' | 'simplified' | 'submark';
export type LogoColour = 'black' | 'white';

// Width ÷ height of each file's viewBox, so the width and height attributes reserve its shape.
export const LOGO_RATIO: Record<LogoVariant, number> = {
  primary: 580.74 / 492.66,
  secondary: 971.46 / 281.98,
  simplified: 797.53 / 169.77,
  submark: 768 / 466,
};

export const LOGO_MIN_HEIGHT: Record<LogoVariant, number> = {
  primary: 120,
  secondary: 40,
  simplified: 28,
  submark: 24,
};

const DEFAULT_HEIGHT: Record<LogoVariant, number> = {
  primary: 140,
  secondary: 48,
  simplified: 28,
  submark: 32,
};

const ALT: Record<LogoVariant, string> = {
  primary: 'MA Apparels by Mustafa Ahmed',
  secondary: 'MA Apparels by Mustafa Ahmed',
  simplified: 'MA Apparels',
  submark: 'MA Apparels',
};

type LogoProps = {
  variant: LogoVariant;
  /** Black on light backgrounds, white on dark. Never black on a dark or busy photo. */
  colour?: LogoColour;
  /** CSS height in px. Raised to the variant's minimum. */
  height?: number;
  loading?: 'eager' | 'lazy';
  className?: string;
};

export function Logo({
  variant,
  colour = 'black',
  height = DEFAULT_HEIGHT[variant],
  loading = 'lazy',
  className,
}: LogoProps) {
  const h = Math.max(height, LOGO_MIN_HEIGHT[variant]);
  return (
    <Image
      src={`/brand/svg/mustafa-apparels-${variant}-${colour}.svg`}
      alt={ALT[variant]}
      width={Math.round(h * LOGO_RATIO[variant])}
      height={h}
      unoptimized
      loading={loading}
      className={className}
      style={{ height: h, width: 'auto' }}
    />
  );
}

/** Home link for the header: the submark on phones, the secondary logo from md up. */
export function HeaderLogo() {
  return (
    <Link href="/" aria-label="Mustafa Apparels home" className="inline-flex min-h-11 items-center">
      <Logo variant="submark" loading="eager" className="md:hidden" />
      <Logo variant="secondary" loading="eager" className="hidden md:block" />
    </Link>
  );
}
