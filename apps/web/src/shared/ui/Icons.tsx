import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

const baseProps = (
  size: number | string = 20,
  strokeWidth: number | string = 1.75,
  props: SVGProps<SVGSVGElement>
) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props
});

/* ==========================================================================
   MUSIC & AUDIO ICONS
   ========================================================================== */

/**
 * Vinyl record icon with grooves and spindle hole.
 * Perfect for music albums, physical records, and track selection.
 */
export function IconVinyl({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" stroke="none" />
      <path d="M12 6a6 6 0 0 1 5.66 4" strokeDasharray="2 2" />
      <path d="M12 18a6 6 0 0 1-5.66-4" strokeDasharray="2 2" />
    </svg>
  );
}

/**
 * Beamed eighth notes music symbol.
 */
export function IconMusic({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="16" r="3" fill="currentColor" stroke="none" />
      <path d="M9 9l12-2" />
    </svg>
  );
}

/**
 * Sound wave audio frequency visualizer.
 */
export function IconSoundwave({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <line x1="3" y1="10" x2="3" y2="14" />
      <line x1="7" y1="6" x2="7" y2="18" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="17" y1="7" x2="17" y2="17" />
      <line x1="21" y1="10" x2="21" y2="14" />
    </svg>
  );
}

/* ==========================================================================
   CARD & NFC / TECH ICONS
   ========================================================================== */

/**
 * Physical identification music card with photo cutout & info lines.
 */
export function IconCard({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <rect x="5" y="7" width="5.5" height="6.5" rx="1" />
      <line x1="13.5" y1="8.5" x2="18.5" y2="8.5" />
      <line x1="13.5" y1="12" x2="18.5" y2="12" />
      <line x1="5" y1="16.5" x2="18.5" y2="16.5" />
    </svg>
  );
}

/**
 * Contactless / NFC wireless signal broadcast arcs.
 */
export function IconNfc({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M6 18a9 9 0 0 1 0-12" />
      <path d="M9.5 15.5a5.5 5.5 0 0 1 0-7" />
      <path d="M13 13.5a2.5 2.5 0 0 1 0-3" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Smartphone with contactless NFC tap waves.
 */
export function IconSmartphoneNfc({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <rect x="4" y="2" width="11" height="20" rx="2.5" />
      <line x1="8.5" y1="5" x2="10.5" y2="5" />
      <path d="M18 8a4 4 0 0 1 0 6" />
      <path d="M20.5 5.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

/**
 * Microchip / NFC silicon IC with circuitry pins.
 */
export function IconChip({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <line x1="9" y1="2" x2="9" y2="7" />
      <line x1="15" y1="2" x2="15" y2="7" />
      <line x1="9" y1="17" x2="9" y2="22" />
      <line x1="15" y1="17" x2="15" y2="22" />
      <line x1="2" y1="9" x2="7" y2="9" />
      <line x1="2" y1="15" x2="7" y2="15" />
      <line x1="17" y1="9" x2="22" y2="9" />
      <line x1="17" y1="15" x2="22" y2="15" />
    </svg>
  );
}

/* ==========================================================================
   CUSTOMIZATION, CRAFT & SIGNATURE
   ========================================================================== */

/**
 * Elegant fine fountain pen / signature stylus.
 */
export function IconPen({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 18.5 3 20l1.5-4L16.5 3.5z" />
      <line x1="14" y1="6" x2="18" y2="10" />
      <line x1="3" y1="20" x2="7" y2="19.5" />
    </svg>
  );
}

/**
 * Refined four-point star sparkle (boutique luxury flair).
 */
export function IconSparkle({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M12 3c0 4.5 4.5 9 9 9-4.5 0-9 4.5-9 9 0-4.5-4.5-9-9-9 4.5 0 9-4.5 9-9z" />
    </svg>
  );
}

/**
 * Pencil / Edit tool for cart items and draft modifications.
 */
export function IconEdit({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/**
 * Minimalist trash can with lid.
 */
export function IconTrash({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/**
 * Clear plus symbol for adding designs / expanding.
 */
export function IconPlus({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * Clean minus symbol.
 */
export function IconMinus({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * Crisp checkmark for verified steps, toasts, and trust features.
 */
export function IconCheck({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Crisp close / cancel cross.
 */
export function IconClose({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Undo / refresh circular arrow for signature pad redraw.
 */
export function IconRefresh({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M23 4v6h-6" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

/**
 * Magnifying glass search / zoom preview icon.
 */
export function IconSearch({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <circle cx="11" cy="11" r="7.5" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}

/**
 * Shield with checkmark for quality assurance & hardware warranty.
 */
export function IconShield({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

/**
 * Star icon for reviews and ratings.
 */
export function IconStar({
  size = 16,
  strokeWidth = 1.5,
  filled = true,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg {...baseProps(size, strokeWidth, props)} fill={filled ? 'currentColor' : 'none'}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function IconPalette({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M12 2C6.49 2 2 6.49 2 12c0 4.19 2.58 7.78 6.24 9.21.36.14.76-.13.76-.52v-.41c0-.98.79-1.78 1.77-1.78h1.23c4.42 0 8-3.58 8-8 0-5.51-4.49-10-10-10z" />
      <circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconUser({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconLink({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function IconImage({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export function IconPhotoAdd({ size = 24, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
      <line x1="16" y1="5" x2="22" y2="5" />
      <line x1="19" y1="2" x2="19" y2="8" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

export function IconDocument({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export function IconMapPin({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconCalendar({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function IconChevronDown({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function IconChevronUp({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function IconChevronLeft({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function IconChevronRight({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function IconExpand({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

export function IconShoppingCart({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export function IconClock({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconPackage({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function IconTruck({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

export function IconQrCode({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" />
      <path d="M14 20h3v-3M20 14v3h1M20 20h1" />
    </svg>
  );
}

export function IconCopy({ size = 16, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
