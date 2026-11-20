import type { ReactNode, SVGProps } from 'react';

type IconName =
  | 'film' | 'check' | 'checkCircle' | 'plus' | 'calendar' | 'clock' | 'edit' | 'users'
  | 'ticket' | 'arrowRight' | 'x' | 'alert' | 'refresh' | 'play' | 'layers' | 'spark'
  | 'search' | 'popcorn' | 'link' | 'chevron' | 'circle';

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export function Icon({ name, size = 20, ...rest }: Props) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.85, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  const paths: Record<IconName, ReactNode> = {
    film: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/></>,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    checkCircle: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" /></>,
    edit: <><path d="m15 5 4 4M4 20l4.4-.9L19.5 8a2.1 2.1 0 0 0-3-3L5.4 16.1 4 20Z" /></>,
    users: <><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.5"/><path d="M22 20v-2a4 4 0 0 0-3-3.9M16 3.4a3.5 3.5 0 0 1 0 6.9"/></>,
    ticket: <><path d="M4 6h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7a1 1 0 0 1 1-1Z"/><path d="M12 6v2m0 3v2m0 3v2"/></>,
    arrowRight: <path d="M4 12h16m-7-7 7 7-7 7"/>,
    x: <path d="M5 5 19 19M19 5 5 19"/>,
    alert: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.2 9a7 7 0 0 1 12-2L20 12M4 12l1.8 5a7 7 0 0 0 12-2"/></>,
    play: <><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/></>,
    spark: <><path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 5 5"/></>,
    popcorn: <><path d="M5 9h14l-2 12H7L5 9ZM6 9 4 6l3-2 3 3 2-4 3 4 3-3 2 2-2 3"/><path d="m10 10 1 10m3-10-1 10"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 1 0-7.1-7.1l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 1 0 7.1 7.1l1.2-1.2"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
    circle: <circle cx="12" cy="12" r="9" />,
  };
  return <svg {...common} {...rest}>{paths[name]}</svg>;
}
