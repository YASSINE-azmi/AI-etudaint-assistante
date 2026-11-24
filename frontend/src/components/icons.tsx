import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function baseProps(props: IconProps): IconProps {
  return {
    'aria-hidden': true,
    focusable: 'false',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  }
}

export function BookOpenIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 5.5h6a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H3z" />
      <path d="M21 5.5h-6a3 3 0 0 0-3 3V20a2.5 2.5 0 0 1 2.5-2.5H21z" />
    </svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z" />
      <path d="m14 7 3 3" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </svg>
  )
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3 5 6v5c0 4.6 3 8.1 7 10 4-1.9 7-5.4 7-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </svg>
  )
}
