import type { ReactNode, SVGProps } from 'react'

// Icone a tratto usate in tutta l'app (stesse dell'anteprima grafica).
// Ereditano il colore dal testo (currentColor) e la dimensione dal CSS del
// contenitore (.icon-btn svg, .tabbar a svg, ...). Sempre decorative:
// l'etichetta accessibile va sul pulsante che le contiene (aria-label).
function Icon({ children, strokeWidth = 2, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.2-3.4A8 8 0 0 1 4 12Z" />
    </Icon>
  )
}

export function TranslateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 5h8M8 3v2M5 11c2-1 4-4 5-6M6 7c1 2 3 4 6 5" />
      <path d="m13 21 4-10 4 10M14.5 17h5" />
    </Icon>
  )
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </Icon>
  )
}

export function BackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="m15 5-7 7 7 7" />
    </Icon>
  )
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  )
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  )
}

export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Icon>
  )
}


export function PhotoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="11" r="2" />
      <path d="m21 16-5-5-8 8" />
    </Icon>
  )
}

export function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  )
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </Icon>
  )
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  )
}

export function ForwardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="m9 5 7 7-7 7" />
    </Icon>
  )
}

export function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </Icon>
  )
}
