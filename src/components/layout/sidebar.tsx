/**
 * Sidebar navigation
 *
 * Fixed desktop sidebar for the authenticated application shell.
 * Renders all navigation sections with active-route highlighting.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { navigation, type NavItem as NavItemConfig, type NavSection } from "@/lib/navigation";
import { ChevronRight } from "@/components/icons";

interface SidebarProps {
  /** Shown at the top of the sidebar */
  userDisplayName?: string;
}

const SIDEBAR_WIDTH = "w-56";

function NavSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
      {children}
    </p>
  );
}

function NavItem({ item }: { item: NavItemConfig }) {
  const pathname = usePathname();
  const isActive = pathname.toLowerCase() === item.href.toLowerCase();
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.status === "coming-soon" ? `${item.label} — coming soon` : item.label}
      className={[
        // `relative` makes this the positioning context for the
        // active-state accent bar on the left edge.
        "relative group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-100",
        isActive
          ? "bg-emerald-500/10 text-emerald-400 font-medium"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Active indicator — left edge accent bar, positioned to this item. */}
      <span
        aria-hidden="true"
        className={[
          "absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-emerald-500 transition-opacity duration-150",
          isActive ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <Icon
        size={16}
        strokeWidth={1.75}
        className={
          isActive
            ? "text-emerald-400 flex-shrink-0"
            : "text-slate-500 group-hover:text-slate-400 flex-shrink-0"
        }
        aria-hidden="true"
      />

      <span className="flex-1 truncate">{item.label}</span>

      {item.status === "coming-soon" && (
        <span className="text-[10px] font-medium text-slate-600 group-hover:text-slate-500">
          Soon
        </span>
      )}

      {isActive && (
        <ChevronRight
          size={12}
          strokeWidth={2}
          className="flex-shrink-0 text-emerald-500/60"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

function NavSection({ section }: { section: NavSection }) {
  return (
    <div className="space-y-0.5">
      <NavSectionLabel>{section.label}</NavSectionLabel>
      {section.items.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </div>
  );
}

export function Sidebar({ userDisplayName }: SidebarProps) {
  return (
    <aside
      className={`${SIDEBAR_WIDTH} flex flex-col h-full border-r border-slate-800/80 bg-slate-950 overflow-hidden`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800/80 flex-shrink-0">
        <BrandMark size="sm" showWordmark={false} />
        <span className="text-sm font-semibold tracking-tight text-slate-100">
          TradeJournal
        </span>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5 overscroll-contain"
        aria-label="Main navigation"
      >
        {navigation.map((section) => (
          <NavSection key={section.label} section={section} />
        ))}
      </nav>

      {/* User footer */}
      {userDisplayName && (
        <div className="flex-shrink-0 border-t border-slate-800/80 px-4 py-3">
          <p
            className="truncate text-xs text-slate-600"
            title={userDisplayName}
          >
            {userDisplayName}
          </p>
        </div>
      )}
    </aside>
  );
}
