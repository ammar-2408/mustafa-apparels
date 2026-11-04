import { Logo } from '@mustafa/ui/logo';
import Link from 'next/link';

/**
 * Home link for the header: the submark on phones, the secondary logo from md, and the
 * secondary logo at 64px from lg so its small line stays readable. Hidden copies share one file.
 */
export function HeaderLogo() {
  return (
    <Link href="/" aria-label="Mustafa Apparels home" className="inline-flex min-h-11 items-center">
      <Logo variant="submark" loading="eager" className="md:hidden" />
      <Logo variant="secondary" loading="eager" className="hidden md:block lg:hidden" />
      <Logo variant="secondary" height={64} loading="eager" className="hidden lg:block" />
    </Link>
  );
}
