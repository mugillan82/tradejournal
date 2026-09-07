/**
 * TradeJournal navigation configuration.
 *
 * The canonical set of application destinations. Items here are
 * rendered by the sidebar/mobile navigation. Unimplemented routes
 * use the `status: "coming-soon"` flag so the application shell can
 * route to a safe placeholder rather than 404.
 */

import {
  LayoutDashboard,
  CalendarDays,
  LineChart,
  PlusCircle,
  Wand2,
  FileSpreadsheet,
  BarChart3,
  FileText,
  Target,
  Tags,
  BookOpen,
  NotebookPen,
  ClipboardList,
  Wallet,
  Database,
  Download,
  Settings as SettingsIcon,
  HelpCircle,
} from "@/components/icons";
import type { IconProps } from "@/components/icons";

/** Icon component type — all icon exports share the same function signature. */
type IconType = React.ComponentType<IconProps>;

export type NavItem = {
  /** Display label */
  label: string;
  /** Internal application path */
  href: string;
  /** Icon component */
  icon: IconType;
  /** Whether the destination is currently implemented */
  status: "ready" | "coming-soon";
};

export type NavSection = {
  /** Section label (small caps) */
  label: string;
  items: NavItem[];
};

export const navigation: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        status: "ready",
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        status: "coming-soon",
      },
    ],
  },
  {
    label: "Trading",
    items: [
      {
        label: "Trades",
        href: "/trades",
        icon: LineChart,
        status: "coming-soon",
      },
      {
        label: "Add Trade",
        href: "/trades/new",
        icon: PlusCircle,
        status: "coming-soon",
      },
      {
        label: "Smart Import",
        href: "/import/smart",
        icon: Wand2,
        status: "coming-soon",
      },
      {
        label: "CSV Import",
        href: "/import/csv",
        icon: FileSpreadsheet,
        status: "coming-soon",
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        status: "coming-soon",
      },
      {
        label: "Reports",
        href: "/reports",
        icon: FileText,
        status: "coming-soon",
      },
      {
        label: "Strategies",
        href: "/strategies",
        icon: Target,
        status: "coming-soon",
      },
      {
        label: "Tags",
        href: "/tags",
        icon: Tags,
        status: "coming-soon",
      },
    ],
  },
  {
    label: "Journal",
    items: [
      {
        label: "Daily Journal",
        href: "/journal",
        icon: BookOpen,
        status: "coming-soon",
      },
      {
        label: "Notebook",
        href: "/notebook",
        icon: NotebookPen,
        status: "coming-soon",
      },
      {
        label: "Trade Reviews",
        href: "/reviews",
        icon: ClipboardList,
        status: "coming-soon",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        label: "Accounts",
        href: "/accounts",
        icon: Wallet,
        status: "coming-soon",
      },
      {
        label: "Data Management",
        href: "/data",
        icon: Database,
        status: "coming-soon",
      },
      {
        label: "Export",
        href: "/export",
        icon: Download,
        status: "coming-soon",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: SettingsIcon,
        status: "coming-soon",
      },
      {
        label: "Help",
        href: "/help",
        icon: HelpCircle,
        status: "coming-soon",
      },
    ],
  },
];

/**
 * Flat list of all navigation hrefs — used by route handlers
 * to detect "this is a known navigation destination" so we can
 * show a polite placeholder for unimplemented items instead of 404.
 */
export const allNavHrefs = new Set<string>(
  navigation.flatMap((section) =>
    section.items.map((item) => item.href.toLowerCase()),
  ),
);

/**
 * Returns true if the given pathname corresponds to a known
 * navigation destination (case-insensitive prefix match).
 */
export function isKnownDestination(pathname: string): boolean {
  const normalized = pathname.toLowerCase().split("?")[0]?.split("#")[0] ?? "";
  if (!normalized) return false;
  for (const href of allNavHrefs) {
    if (normalized === href) return true;
    // Allow sub-paths of nav destinations (e.g. /trades/abc-123)
    if (normalized.startsWith(`${href}/`)) return true;
  }
  return false;
}
