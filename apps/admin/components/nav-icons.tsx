// Line icons for the admin sidebar (owner, 2026-11-22: the storefront's look). Decorative: the
// link text names each section.
type IconProps = { className?: string };

const line = {
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className ?? 'size-5 shrink-0'}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" {...line} />
      <rect x="13" y="4" width="7" height="7" rx="1.5" {...line} />
      <rect x="4" y="13" width="7" height="7" rx="1.5" {...line} />
      <rect x="13" y="13" width="7" height="7" rx="1.5" {...line} />
    </Svg>
  );
}

export function HangerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 7.5a2 2 0 1 1 2-2c0 1.2-2 1.6-2 3L3.5 15a1.3 1.3 0 0 0 .8 2.4h15.4a1.3 1.3 0 0 0 .8-2.4L12 8.5"
        {...line}
      />
    </Svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 4 3.5 8.5 12 13l8.5-4.5L12 4zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5"
        {...line}
      />
    </Svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 4c4.7 0 8.5 3.1 8.5 7s-3.8 7-8.5 7c-1 0-2-.1-2.9-.4L5 20l.9-3.6C4.4 15 3.5 13.1 3.5 11c0-3.9 3.8-7 8.5-7z"
        {...line}
      />
    </Svg>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.5" {...line} />
      <path
        d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 13.8c2.1.8 3.5 3 3.5 6.2"
        {...line}
      />
    </Svg>
  );
}

export function CogIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" {...line} />
      <path
        d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"
        {...line}
      />
    </Svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" {...line} />
    </Svg>
  );
}
