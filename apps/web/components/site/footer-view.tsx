import { Logo } from '@mustafa/ui/logo';
import Link from 'next/link';

import { HELP_LINKS, LEGAL_LINKS, type NavLink } from '../../lib/nav';

type Props = { shop: NavLink[]; socials: NavLink[]; serviceArea: string | null };

function Column({
  title,
  links,
  external,
}: {
  title: string;
  links: NavLink[];
  external?: boolean;
}) {
  return (
    <div>
      <h2 className="caps-tight">{title}</h2>
      <ul className="mt-4 flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.href}>
            {external ? (
              <a href={link.href} className="link inline-block py-2" target="_blank" rel="noopener">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="link inline-block py-2">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Powder blue band with the primary black logo (docs/design.md §1.3, §4). Ink text only on it.
export function FooterView({ shop, socials, serviceArea }: Props) {
  return (
    <footer className="bg-primary text-primary-fg">
      <div className="mx-auto grid max-w-content-wide gap-12 px-gutter py-16 md:grid-cols-[auto_1fr] md:gap-24">
        <div>
          <Link href="/" className="inline-block">
            <Logo variant="primary" height={140} />
          </Link>
          <p className="mt-6 max-w-xs text-body">
            Unstitched 2-piece and 3-piece suits, ordered on WhatsApp. Courier delivery across{' '}
            {serviceArea ?? 'Pakistan'}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <Column title="Shop" links={shop} />
          <Column title="Help" links={HELP_LINKS} />
          <Column title="Policies" links={LEGAL_LINKS} />
          {socials.length > 0 && <Column title="Follow" links={socials} external />}
        </div>
      </div>
      <p className="mx-auto max-w-content-wide px-gutter pb-8 text-small">© Mustafa Apparels</p>
    </footer>
  );
}
