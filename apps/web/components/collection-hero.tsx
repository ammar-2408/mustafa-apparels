import Image from 'next/image';
import Link from 'next/link';

import { dmSerif } from '../app/fonts-serif';
import { SITE_ART } from '../lib/site-art';
import type { Crumb } from '../lib/structured-data';
import { HomeIcon, ShirtIcon } from './site/icons';

type Props = {
  name: string;
  description: string | null;
  crumbs: Crumb[];
  total: number;
  page: number;
};

const suitsLabel = (n: number) => `${n} ${n === 1 ? 'suit' : 'suits'}`;

// The header of every collection page, new ones from admin included (the owner's
// `collecion template.png`, 2026-11-17, in the site's colours): the breadcrumb, the name in the
// serif, a lotus between orange lines, the description, a count badge, and draped fabric fading
// in on the right. The band is white at the top, so the orange breadcrumb stays readable.
export function CollectionHero({ name, description, crumbs, total, page }: Props) {
  return (
    <section
      className={`${dmSerif.variable} relative overflow-hidden bg-linear-to-b from-bg via-surface-soft to-surface-soft`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] [mask-image:linear-gradient(to_right,transparent,black_45%)] md:block"
      >
        <Image
          src={SITE_ART.collectionFabric.src}
          alt=""
          fill
          loading="eager"
          sizes="58vw"
          className="object-cover object-right-top"
        />
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-surface-soft to-transparent" />
      </div>

      <div className="relative mx-auto max-w-content-wide px-gutter pt-10 pb-12 md:pt-14 md:pb-16">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-small">
            {crumbs.map((crumb, i) => (
              <li key={crumb.path} className="flex items-center gap-2">
                {i > 0 && (
                  <span aria-hidden="true" className="text-muted">
                    /
                  </span>
                )}
                {i < crumbs.length - 1 ? (
                  <Link href={crumb.path} className="link inline-flex min-h-6 items-center gap-2">
                    {i === 0 && <HomeIcon className="size-5" />}
                    {crumb.name}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-accent-text">
                    {crumb.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-serif text-display text-deep">
              {name}
              {page > 1 && (
                <span className="mt-2 block font-sans text-h3 font-light text-muted">
                  Page {page}
                </span>
              )}
            </h1>
            <span aria-hidden="true" className="mt-4 flex items-center gap-3">
              <span className="h-0.5 w-20 bg-accent" />
              <svg viewBox="0 0 24 24" fill="none" className="size-6 text-accent-text">
                <path
                  d="M12 4c2.6 3 3.4 7.5 0 13-3.4-5.5-2.6-10 0-13zM12 17c-2-4.5-5.5-7-9-7 .5 4.5 4 7 9 7zM12 17c2-4.5 5.5-7 9-7-.5 4.5-4 7-9 7z"
                  fill="currentColor"
                />
              </svg>
              <span className="h-0.5 w-20 bg-accent" />
            </span>
            {description && <p className="mt-6 max-w-2xl text-body-lg">{description}</p>}
          </div>
          <p
            aria-live="polite"
            className="inline-flex shrink-0 items-center gap-3 self-start rounded-full border border-deep/30 bg-bg/70 px-5 py-3 caps-tight md:self-end"
          >
            <ShirtIcon className="size-6" />
            {suitsLabel(total)}
          </p>
        </div>
      </div>
    </section>
  );
}
