type IconName =
  | 'search'
  | 'settings'
  | 'archive'
  | 'logout'
  | 'user'
  | 'document'
  | 'clock'
  | 'share'
  | 'trash'
  | 'close'
  | 'back'
  | 'plus'
  | 'check'
  | 'drag'
  | 'bookmark'
  | 'warning'
  | 'pencil'
  | 'feed'
  | 'download'
  | 'chevron-right'
  | 'chevron-down'

interface IconProps {
  name: IconName
  className?: string
}

export default function Icon({ name, className = 'h-5 w-5' }: IconProps) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }

  switch (name) {
    case 'search':
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.2-4.2" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3 1a8 8 0 0 0-1.7-1L14.5 3h-5L9 5a8 8 0 0 0-1.7 1L5 5.9 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.3-1a8 8 0 0 0 1.7 1l.5 2h5l.5-2a8 8 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />
        </svg>
      )
    case 'archive':
      return (
        <svg {...commonProps}>
          <path d="M4 7.5h16" />
          <path d="M6 7.5h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" />
          <path d="M9.5 12h5" />
        </svg>
      )
    case 'logout':
      return (
        <svg {...commonProps}>
          <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
          <path d="M13 16l4-4-4-4" />
          <path d="M8 12h9" />
        </svg>
      )
    case 'user':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      )
    case 'document':
      return (
        <svg {...commonProps}>
          <path d="M8 3.5h6l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 7 20V5a1.5 1.5 0 0 1 1-1.4Z" />
          <path d="M14 3.5V8h4" />
          <path d="M9.5 12h5" />
          <path d="M9.5 15.5h5" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5v5l3 1.8" />
        </svg>
      )
    case 'share':
      return (
        <svg {...commonProps}>
          <path d="M12 16V4.5" />
          <path d="m7.5 9 4.5-4.5L16.5 9" />
          <path d="M5 14.5v3A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5v-3" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...commonProps}>
          <path d="M4.5 7h15" />
          <path d="M9.5 3.8h5l.7 1.7H8.8Z" />
          <path d="M7 7l.8 12.2A1.5 1.5 0 0 0 9.3 20.5h5.4a1.5 1.5 0 0 0 1.5-1.3L17 7" />
          <path d="M10 10.5v6" />
          <path d="M14 10.5v6" />
        </svg>
      )
    case 'close':
      return (
        <svg {...commonProps}>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </svg>
      )
    case 'back':
      return (
        <svg {...commonProps}>
          <path d="m15.5 5.5-6 6 6 6" />
          <path d="M9.5 11.5h9" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )
    case 'check':
      return (
        <svg {...commonProps}>
          <path d="m5.5 12.5 4 4L18.5 7.5" />
        </svg>
      )
    case 'drag':
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="8" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'bookmark':
      return (
        <svg {...commonProps}>
          <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.5L6 20V5.5a1 1 0 0 1 1-1Z" />
        </svg>
      )
    case 'warning':
      return (
        <svg {...commonProps}>
          <path d="M12 4.5 20 19H4l8-14.5Z" />
          <path d="M12 9v4.5" />
          <circle cx="12" cy="16.5" r=".8" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'pencil':
      return (
        <svg {...commonProps}>
          <path d="m4.5 16.5 9.8-9.8 3 3-9.8 9.8-4 1 1-4Z" />
          <path d="m13.5 6.5 3 3" />
        </svg>
      )
    case 'feed':
      return (
        <svg {...commonProps}>
          <path d="M6 17.5a10 10 0 0 1 10 0" />
          <path d="M7.5 13a7 7 0 0 1 9 0" />
          <path d="M9.5 8.8a4.5 4.5 0 0 1 5 0" />
          <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'download':
      return (
        <svg {...commonProps}>
          <path d="M12 4.5v10" />
          <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
          <path d="M5 18.5h14" />
        </svg>
      )
    case 'chevron-right':
      return (
        <svg {...commonProps}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      )
    case 'chevron-down':
      return (
        <svg {...commonProps}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      )
    default:
      return null
  }
}
