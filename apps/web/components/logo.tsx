import { Logo } from '@mustafa/ui/logo';
import Link from 'next/link';

/**
 * Home link for the header: the full secondary logo on every screen, so its small line
 * ("BY MUSTAFA AHMED") can be read (owner, 2026-11-17). 48px on phones, 64px from md, 72px from lg
 * and 80px from xl. It is the SVG, so it stays sharp at any size and pixel density. All copies
 * share one file, so it downloads once.
 */
export function HeaderLogo() {
  return (
    <Link
      href="/"
      aria-label="Mustafa Apparels home"
      className="inline-flex min-h-11 shrink-0 items-center"
    >
      <Logo variant="secondary" height={48} loading="eager" className="md:hidden" />
      <Logo variant="secondary" height={64} loading="eager" className="hidden md:block lg:hidden" />
      <Logo variant="secondary" height={72} loading="eager" className="hidden lg:block xl:hidden" />
      <Logo variant="secondary" height={80} loading="eager" className="hidden xl:block" />
    </Link>
  );
}
