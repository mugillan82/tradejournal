/**
 * Mobile sidebar drawer
 *
 * Slide-in navigation drawer used on small viewports.
 * - Closes on Escape key
 * - Closes on backdrop click
 * - Closes when a link is clicked
 * - Locks body scroll while open
 * - Returns focus to the trigger on close
 * - Traps focus inside the drawer
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "@/components/brand/brand-mark";
import { navigation, type NavSection } from "@/lib/navigation";
import { Menu, X } from "@/components/icons";

// Stable trigger button — same JSX before and after hydration so
// the SSR markup and the client first-render match exactly.
function TriggerButton({
  open,
  titleId,
  onClick,
}: {
  open: boolean;
  titleId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation"
      aria-expanded={open}
      aria-controls={titleId}
      className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
    >
      <Menu size={20} strokeWidth={2} />
    </button>
  );
}

interface MobileSidebarProps {
  /** Authenticated user display name (shown in the drawer footer). */
  userDisplayName?: string;
}

/**
 * Hook for trapping focus within a container element.
 * Restores focus to the previously focused element on cleanup.
 */
function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      if (!container) return [];
      const selector =
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), [role="button"]';
      return Array.from(
        container.querySelectorAll<HTMLElement>(selector),
      ).filter((el) => !el.hasAttribute("data-focus-skip"));
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // Initial focus
    const focusable = getFocusable();
    focusable[0]?.focus();

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef]);
}

interface DrawerItemProps {
  href: string;
  label: string;
  status: "ready" | "coming-soon";
  onNavigate: () => void;
}

function DrawerItem({ href, label, status, onNavigate }: DrawerItemProps) {
  const pathname = usePathname();
  const isActive = pathname.toLowerCase() === href.toLowerCase();

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={[
        "flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm transition-colors duration-100",
        isActive
          ? "bg-emerald-500/10 text-emerald-400 font-medium"
          : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60",
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={[
            "h-1.5 w-1.5 rounded-full",
            isActive ? "bg-emerald-500" : "bg-slate-700",
          ].join(" ")}
        />
        {label}
      </span>
      {status === "coming-soon" && (
        <span className="text-[10px] font-medium text-slate-600">Soon</span>
      )}
    </Link>
  );
}

function DrawerContent({
  userDisplayName,
  onClose,
  drawerRef,
}: {
  userDisplayName?: string;
  onClose: () => void;
  drawerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Main navigation"
      className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-slate-950 border-r border-slate-800 shadow-2xl shadow-black/40"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        <BrandMark size="sm" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-md p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 overscroll-contain">
        {navigation.map((section: NavSection) => (
          <div key={section.label} className="space-y-0.5">
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {section.label}
            </p>
            {section.items.map((item) => (
              <DrawerItem
                key={item.href}
                href={item.href}
                label={item.label}
                status={item.status}
                onNavigate={onClose}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      {userDisplayName && (
        <div className="flex-shrink-0 border-t border-slate-800 px-4 py-3">
          <p
            className="truncate text-xs text-slate-500"
            title={userDisplayName}
          >
            {userDisplayName}
          </p>
        </div>
      )}
    </div>
  );
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
      aria-hidden="true"
    />
  );
}

export function MobileSidebar({ userDisplayName }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  useFocusTrap(open, drawerRef);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // When the trigger button is used, keep ref to it so we can return focus on close
  const openDrawer = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLButtonElement | null;
    setOpen(true);
  }, []);

  // Build portal content only after hydration. We check typeof document
  // at render time so the trigger button renders identically on SSR
  // and the first client render.
  const portalContent: ReactNode = open && typeof document !== "undefined" ? (
    <>
      <Backdrop onClose={() => setOpen(false)} />
      <DrawerContent
        userDisplayName={userDisplayName}
        onClose={() => setOpen(false)}
        drawerRef={drawerRef}
      />
    </>
  ) : null;

  return (
    <>
      <TriggerButton
        open={open}
        titleId={titleId}
        onClick={openDrawer}
      />
      {portalContent ? createPortal(portalContent, document.body) : null}
    </>
  );
}
