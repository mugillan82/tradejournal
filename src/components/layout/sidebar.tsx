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
import { navigation, type NavSection } from "@/lib/navigation";
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

interface NavItemProps {
  label: string;
  href: string;
  status: "ready" | "coming-soon";
}

function NavItem({ label, href, status }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname.toLowerCase() === href.toLowerCase();

  return (
    <Link
      href={href}
      title={status === "coming-soon" ? `${label} — coming soon` : label}
      className={[
        "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-100",
        isActive
          ? "bg-emerald-500/10 text-emerald-400 font-medium"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Active indicator — left border accent */}
      <span
        aria-hidden="true"
        className={[
          "absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-emerald-500 transition-opacity duration-150",
          isActive ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{ position: "absolute" }}
      />

      <span className="relative flex-1 truncate">{label}</span>

      {status === "coming-soon" && (
        <span className="relative text-[10px] font-medium text-slate-600 group-hover:text-slate-500">
          Soon
        </span>
      )}

      {isActive && (
        <ChevronRight
          size={12}
          strokeWidth={2}
          className="relative flex-shrink-0 text-emerald-500/60"
        />
      )}
    </Link>
  );
}

function NavSection({ label, items }: NavSection) {
  return (
    <div className="space-y-0.5">
      <NavSectionLabel>{label}</NavSectionLabel>
      {items.map((item) => (
        <NavItem
          key={item.href}
          label={item.label}
          href={item.href}
          status={item.status}
        />
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
          <NavSection
            key={section.label}
            label={section.label}
            items={section.items}
          />
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
