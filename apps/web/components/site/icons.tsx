import type { JSX } from 'react';

// Line icons for the header and contact buttons. Decorative: the control carries the name.
type IconProps = { className?: string };

const base = 'size-6 shrink-0';
const cls = (className?: string) => (className ? `${base} ${className}` : base);

export function MenuIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function AccountIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M4 20l1.2-3.6A8 8 0 1 1 8 19l-4 1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2L9 9.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <rect x="3" y="5" width="18" height="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 6l9 7 9-7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path d="M4 12h16M14 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// A kurta shirt.
export function ShirtIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M9 3l3 2.5L15 3l5.5 3.5-2.5 4-1.5-1V21h-9V9.5L6 10.5l-2.5-4L9 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 5.5V11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// A woven diamond, for a textured fabric.
export function LatticeIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M12 2.5L21.5 12 12 21.5 2.5 12 12 2.5zM7.25 7.25l9.5 9.5M16.75 7.25l-9.5 9.5M9.6 4.9l9.5 9.5M14.4 4.9l-9.5 9.5M4.9 9.6l9.5 9.5M19.1 9.6l-9.5 9.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PETALS = [0, 45, 90, 135, 180, 225, 270, 315];

// An eight-petal flower.
export function FlowerIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      {PETALS.map((angle) => (
        <ellipse
          key={angle}
          cx="12"
          cy="6.5"
          rx="2.4"
          ry="4"
          transform={`rotate(${angle} 12 12)`}
          stroke="currentColor"
          strokeWidth="1.25"
        />
      ))}
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

// A lotus: three petals over a curved base.
export function LotusIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M12 4c2.6 3 3.4 7.5 0 13-3.4-5.5-2.6-10 0-13zM12 17c-2-4.5-5.5-7-9-7 .5 4.5 4 7 9 7zM12 17c2-4.5 5.5-7 9-7-.5 4.5-4 7-9 7zM5 19.5c4.5 1.3 9.5 1.3 14 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Folded fabric in a stack, for "All suits".
export function LayersIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M12 3.5l9 4.5-9 4.5L3 8l9-4.5zM3 12l9 4.5 9-4.5M3 16l9 4.5 9-4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A shopping bag, for "How to Order".
export function BagIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M4.5 8h15l-1 13h-13l-1-13zM9 10V6.5a3 3 0 0 1 6 0V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A suit with a small heart, for "Choose a suit". The heart is orange.
export function SuitHeartIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M9 2.5l1.5 2h3L15 2.5l2.5 2.5-1.5 3v3.5l3 10H5l3-10V8L6.5 5 9 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M19 13.2c.8-1.3 3-1 3 .8 0 1.6-3 3.5-3 3.5s-3-1.9-3-3.5c0-1.8 2.2-2.1 3-.8z"
        className="fill-accent-text"
      />
    </svg>
  );
}

// A delivery van with speed lines, for "Courier delivery".
export function TruckIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M7 6h9v10H7zM16 9h3l3 3.5V16h-6M1 8h4M2 11h3M3 14h2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx="10"
        cy="17.5"
        r="1.8"
        className="fill-bg"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="18.5"
        cy="17.5"
        r="1.8"
        className="fill-bg"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

// Social profiles in the footer, simple line drawings in ink (no brand colours).
export function InstagramIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4a20 20 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21"
        fill="currentColor"
      />
    </svg>
  );
}

export function TikTokIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M14 3.5v11.2a3.3 3.3 0 1 1-3.3-3.3M14 3.5c.4 2.6 2.2 4.4 4.8 4.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function YouTubeIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9.2v5.6l4.8-2.8L10 9.2z" fill="currentColor" />
    </svg>
  );
}

// A heart, for the saved suits.
export function HeartIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cls(className)}>
      <path
        d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Icon = (props: IconProps) => JSX.Element;

// Each collection's icon in the menu and on its Shop by Fabric card. A collection the owner adds
// later in admin gets the folded-fabric icon until it has its own.
const COLLECTION_ICONS: Record<string, { menu: Icon; card: Icon }> = {
  dhanak: { menu: ShirtIcon, card: FlowerIcon },
  khaddar: { menu: LatticeIcon, card: LatticeIcon },
  lajwanti: { menu: FlowerIcon, card: LotusIcon },
};

export function collectionIcon(slug: string, place: 'menu' | 'card'): Icon {
  return COLLECTION_ICONS[slug]?.[place] ?? LayersIcon;
}
