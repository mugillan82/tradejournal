/**
 * TradeJournal Icons
 *
 * Lightweight inline SVG icon set built from Lucide's open-source
 * paths (MIT licensed — https://lucide.dev/license).
 *
 * Each icon is a thin wrapper around a standardized SVG element so
 * all icons share consistent stroke, size, and color behavior.
 *
 * Usage:
 *   import { LayoutDashboard } from "@/components/icons";
 *   <LayoutDashboard size={16} />
 */

import { type SVGProps, forwardRef } from "react";

/** Valid size values matching Tailwind sizing scale. */
export type IconSize = 12 | 14 | 16 | 18 | 20 | 24;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "xmlns"> {
  /** Pixel size (width & height). Default 16. */
  size?: IconSize;
  /** Stroke width. Default 1.75. */
  strokeWidth?: number;
}

/**
 * Base icon shell. All TradeJournal icons forward through this component.
 * Applies consistent sizing, stroke styling, and accessibility defaults.
 */
const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, strokeWidth = 1.75, className = "", ...props }, ref) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      ref={ref}
      {...props}
    />
  ),
);
Icon.displayName = "Icon";

// ─── Overview ────────────────────────────────────────────────────

export function LayoutDashboard({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </Icon>
  );
}

export function CalendarDays({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </Icon>
  );
}

// ─── Trading ──────────────────────────────────────────────────────

export function LineChart({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="m19 9-5 5-4-4-3 3" />
    </Icon>
  );
}

export function PlusCircle({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </Icon>
  );
}

export function Wand2({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M21.42 15.578a1.804 1.804 0 0 0-2.406-.422l-1.14.953a1.804 1.804 0 0 1-2.406-.422l-.172-.172a1.804 1.804 0 0 0-2.406-.422l-1.14.953a1.804 1.804 0 0 1-2.406-.422" />
      <path d="m12 2 2.5 7.5H22" />
      <path d="m5.5 21.5 6.5-14 6.5 14" />
    </Icon>
  );
}

export function FileSpreadsheet({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h2" />
      <path d="M8 17h2" />
      <path d="M14 13h2" />
      <path d="M14 17h2" />
    </Icon>
  );
}

// ─── Analytics ────────────────────────────────────────────────────

export function BarChart3({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M3 6v14a2 2 0 0 0 2 2h2" />
      <path d="M15 6v14a2 2 0 0 1-2 2h-2" />
      <path d="M9 6v14a2 2 0 0 0 2 2h2" />
      <path d="M3 12h18" />
    </Icon>
  );
}

export function FileText({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </Icon>
  );
}

export function Target({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Icon>
  );
}

export function Tags({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </Icon>
  );
}

// ─── Journal ──────────────────────────────────────────────────────

export function BookOpen({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Icon>
  );
}

export function NotebookPen({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M13 18V6l-3 2" />
      <path d="M13 6l3 12" />
      <rect width="5" height="5" x="3" y="13" rx="1" />
      <path d="M13 2a4 4 0 0 0-4 4v10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6a4 4 0 0 0-4-4z" />
    </Icon>
  );
}

export function ClipboardList({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </Icon>
  );
}

// ─── Data ────────────────────────────────────────────────────────

export function Wallet({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </Icon>
  );
}

export function Database({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </Icon>
  );
}

export function Download({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </Icon>
  );
}

// ─── Settings ─────────────────────────────────────────────────────

export function Settings({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function HelpCircle({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </Icon>
  );
}

// ─── Navigation extras ────────────────────────────────────────────

export function ChevronRight({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

export function ChevronDown({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function Menu({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </Icon>
  );
}

export function X({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  );
}

export function LogOut({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </Icon>
  );
}

export function User({ size, strokeWidth, ...props }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...props}>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </Icon>
  );
}

/** Re-export IconProps for consumers (e.g. navigation.ts). */
export type { IconProps };
