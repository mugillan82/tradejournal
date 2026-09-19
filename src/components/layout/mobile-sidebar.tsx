/**
 * Mobile Sidebar Drawer — Stitch Obsidian Orbit Edition
 *
 * Slide-in navigation drawer used on small viewports.
 * Features:
 * - Obsidian dark glass backdrop and panel
 * - Orbit badges and active item beacons
 * - Accessible focus trap and ESC / backdrop dismissal
 */

"use client";

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
import { navigation } from "@/lib/navigation";
import { Menu, X, Search } from "@/components/icons";
import { BranchedMenu } from "@/components/layout/branched-menu";

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
      className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 border border-white/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
    >
      <Menu size={20} strokeWidth={2} />
    </button>
  );
}

interface MobileSidebarProps {
  /** Authenticated user display name (shown in the drawer footer). */
  userDisplayName?: string;
  onOpenCommandPalette?: () => void;
}

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

    const focusable = getFocusable();
    focusable[0]?.focus();

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef]);
}

function DrawerContent({
  userDisplayName,
  onClose,
  drawerRef,
  onOpenCommandPalette,
}: {
  userDisplayName?: string;
  onClose: () => void;
  drawerRef: React.RefObject<HTMLDivElement | null>;
  onOpenCommandPalette?: () => void;
}) {
  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Main navigation"
      className="fixed inset-y-0 left-0 z-50 flex w-76 max-w-[85vw] flex-col bg-[#07050b] border-r border-white/10 shadow-2xl shadow-black/90"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08] bg-[#090710]">
        <BrandMark size="sm" showWordmark={true} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-lg p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Quick search shortcut */}
      {onOpenCommandPalette && (
        <div className="px-3 pt-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCommandPalette();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300"
          >
            <span className="flex items-center gap-2">
              <Search size={14} className="text-purple-400" />
              Quick Command Search
            </span>
            <kbd className="font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation — Branched Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 overscroll-contain">
        <BranchedMenu
          items={navigation}
          onNavigate={onClose}
          width={280}
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-white/[0.08] bg-[#090710] px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-purple-400 font-semibold uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            Orbit System
          </span>
          <span className="text-[10px] font-mono text-slate-500">v2.5</span>
        </div>
        {userDisplayName && (
          <p
            className="truncate text-xs text-slate-400"
            title={userDisplayName}
          >
            {userDisplayName}
          </p>
        )}
      </div>
    </div>
  );
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      aria-hidden="true"
    />
  );
}

export function MobileSidebar({
  userDisplayName,
  onOpenCommandPalette,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  useFocusTrap(open, drawerRef);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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

  const openDrawer = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLButtonElement | null;
    setOpen(true);
  }, []);

  const portalContent: ReactNode =
    open && typeof document !== "undefined" ? (
      <>
        <Backdrop onClose={() => setOpen(false)} />
        <DrawerContent
          userDisplayName={userDisplayName}
          onClose={() => setOpen(false)}
          drawerRef={drawerRef}
          onOpenCommandPalette={onOpenCommandPalette}
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
