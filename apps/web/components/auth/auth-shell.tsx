import { Logo } from '@mustafa/ui/logo';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { dmSerif } from '../../app/fonts-serif';
import { SITE_ART } from '../../lib/site-art';
import { Swash } from '../site/flourish';

type Props = {
  /** The title's first words, in deep green. */
  title: string;
  /** The title's last word, in deep orange with the swash under it. */
  accent: string;
  lead: string;
  /** The card: the form. */
  children: ReactNode;
  /** Under the form, inside the card: "Already have an account? Log in" and the like. */
  footer?: ReactNode;
};

/**
 * The sign-up and login layout (owner's NEWSIGNUP.png and NEWLOGIN.png, 2026-11-22). On large
 * screens a photo of embroidered suits on a brass rail fills the left side, ending in a curve
 * with a thin gold line. On the right: our logo, a serif title with an orange swash under its
 * last word, a welcome line and a white card with the form. Soft leaves sit in the top corner
 * and green embroidered fabric in the bottom one. Every picture is decoration.
 *
 * Like every hero, it all fits the first screen (owner, 2026-11-22): spacing and the title follow
 * the screen height (svh), and the logo is left out where the navbar's logo sits just above it
 * (phones and short screens). e2e/web/auth.spec.ts checks a phone, 1366×768, 1280×720 and 1920×1080.
 */
export function AuthShell({ title, accent, lead, children, footer }: Props) {
  return (
    <div
      className={`${dmSerif.variable} relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-accent/5 md:min-h-[calc(100svh-5rem)] lg:grid lg:min-h-[calc(100svh-6rem)] lg:grid-cols-[minmax(0,34%)_1fr]`}
    >
      {/* The rail of suits, with its curved, gold-edged side. */}
      <div aria-hidden="true" className="relative hidden lg:block">
        <Image
          src={SITE_ART.authRack.src}
          alt=""
          fill
          sizes="34vw"
          priority
          className="object-cover object-left-top"
        />
        <svg
          viewBox="0 0 100 1000"
          preserveAspectRatio="none"
          className="absolute inset-y-0 right-0 h-full w-28 xl:w-36"
        >
          {/* The page colour over the photo's edge, then the gold line along the curve. */}
          <path d="M100 0H62C10 180 0 330 30 520s70 330 40 480h30z" className="fill-bg" />
          <path d="M100 0H62C10 180 0 330 30 520s70 330 40 480h30z" className="fill-accent/5" />
          <path
            d="M62 0C10 180 0 330 30 520s70 330 40 480"
            className="fill-none stroke-gold"
            strokeWidth="5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="relative flex flex-col items-center justify-center px-gutter py-[clamp(0.75rem,2.5svh,3rem)]">
        <span aria-hidden="true">
          <Image
            src={SITE_ART.authLeaves.src}
            alt=""
            width={262}
            height={315}
            sizes="16rem"
            style={{
              maskImage: 'radial-gradient(ellipse at top right, black 35%, transparent 72%)',
            }}
            className="pointer-events-none absolute top-0 right-0 -z-10 w-40 mix-blend-multiply sm:w-56"
          />
          <Image
            src={SITE_ART.authFabric.src}
            alt=""
            width={260}
            height={269}
            sizes="16rem"
            style={{
              maskImage: 'radial-gradient(ellipse at bottom right, black 30%, transparent 68%)',
            }}
            className="pointer-events-none absolute right-0 bottom-0 -z-10 hidden w-48 mix-blend-multiply md:block xl:w-64"
          />
        </span>

        <div className="mb-[clamp(0.5rem,2svh,2rem)] hidden sm:block [@media(max-height:680px)]:hidden [&_img]:h-[clamp(2.5rem,6svh,4rem)]! [&_img]:w-auto!">
          <Logo variant="secondary" height={64} loading="eager" />
        </div>
        <h1 className="text-center font-serif text-[clamp(2rem,6svh,4.5rem)] leading-[1.05] text-deep">
          {title}{' '}
          <span className="relative inline-block text-accent-text">
            {accent}
            <Swash className="absolute -bottom-2 left-1/2 h-3 w-[110%] -translate-x-1/2" />
          </span>
        </h1>
        <p className="mt-[clamp(0.75rem,2svh,1.5rem)] max-w-xl text-center text-body md:text-body-lg">
          {lead}
        </p>

        <div className="mt-[clamp(0.75rem,2.5svh,2.5rem)] w-full max-w-xl rounded-lg border border-border bg-bg/95 px-5 py-[clamp(1rem,2.6svh,2.5rem)] shadow-soft sm:px-10">
          {children}
          {footer && (
            <div className="mt-[clamp(0.75rem,2svh,2rem)] text-center text-body">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
