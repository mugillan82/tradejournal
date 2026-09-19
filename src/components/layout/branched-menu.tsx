"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Sparkles } from "@/components/icons";
import type { NavSection, NavItem } from "@/lib/navigation";
import "./branched-menu.css";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const PAD = 4;
const MARK = 18;

export interface BranchedMenuProps {
  items: NavSection[];
  onNavigate?: () => void;
  color?: string;
  accentColor?: string;
  lineColor?: string;
  width?: number;
  rowHeight?: number;
  indent?: number;
  trunk?: number;
  radius?: number;
  lineWidth?: number;
  fontSize?: number;
  drawDuration?: number;
  foldDuration?: number;
  className?: string;
}

function isItemActive(pathname: string, href: string): boolean {
  const current = pathname.toLowerCase();
  const target = href.toLowerCase();
  if (current === target) return true;
  if (
    target !== "/" &&
    target !== "/dashboard" &&
    current.startsWith(`${target}/`)
  ) {
    return true;
  }
  return false;
}

export function BranchedMenu({
  items,
  onNavigate,
  color = "#94a3b8",
  accentColor = "#a855f7",
  lineColor = "#3b3654",
  width = 240,
  rowHeight = 32,
  indent = 44,
  trunk = 6,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 13,
  drawDuration = 400,
  foldDuration = 280,
  className = "",
}: BranchedMenuProps) {
  const pathname = usePathname();

  // Find active section index based on current URL
  const getActiveSectionIndex = useCallback(() => {
    return items.findIndex((section) =>
      section.items.some((item) => isItemActive(pathname, item.href))
    );
  }, [items, pathname]);

  // Default: start with all sections open
  const [open, setOpen] = useState<Set<number>>(() => {
    return new Set(items.map((_, i) => i));
  });

  // Ensure current section is open when navigating
  useEffect(() => {
    const activeSec = getActiveSectionIndex();
    if (activeSec >= 0) {
      setOpen((prev) => {
        if (prev.has(activeSec)) return prev;
        const next = new Set(prev);
        next.add(activeSec);
        return next;
      });
    }
  }, [getActiveSectionIndex]);

  const navRef = useRef<HTMLElement | null>(null);
  const heads = useRef<(HTMLButtonElement | null)[]>([]);
  const markerRef = useRef<HTMLSpanElement | null>(null);

  const activeSection = getActiveSectionIndex();
  const markerShown = activeSection >= 0 && open.has(activeSection);

  // Place active gliding marker on rail next to active section header
  useIsomorphicLayoutEffect(() => {
    const place = (glide: boolean) => {
      const m = markerRef.current;
      const el = heads.current[activeSection];
      if (!m) return;
      const on = markerShown && Boolean(el);
      if (!glide) m.style.transition = "none";
      if (on && el) {
        m.style.top = `${el.offsetTop + (el.offsetHeight - MARK) / 2}px`;
      }
      m.setAttribute("data-on", on ? "true" : "false");
      if (!glide) {
        void m.offsetHeight;
        m.style.transition = "";
      }
    };

    place(true);

    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      place(false);
    });

    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeSection, markerShown, items, fontSize, rowHeight]);

  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  // Geometry calculations
  const r = Math.min(radius, rowHeight / 2 - 2);
  const endX = indent - 8;
  const rowY = (k: number) => PAD + k * rowHeight + rowHeight / 2;
  const branch = (k: number) =>
    `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const reach = (k: number) =>
    `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const length = (k: number) =>
    rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className={`branched-menu${className ? ` ${className}` : ""}`}
      style={
        {
          "--bm-w": `${width}px`,
          "--bm-ink": color,
          "--bm-accent": accentColor,
          "--bm-line": lineColor,
          "--bm-font": `${fontSize}px`,
          "--bm-row": `${rowHeight}px`,
          "--bm-indent": `${indent}px`,
          "--bm-line-w": lineWidth,
          "--bm-draw": `${drawDuration}ms`,
          "--bm-fold": `${foldDuration}ms`,
        } as React.CSSProperties
      }
    >
      {/* Gliding Rail Marker */}
      <span
        ref={markerRef}
        className="branched-menu__marker"
        aria-hidden="true"
        data-on="false"
      />

      {items.map((section, sIdx) => {
        const isOpen = open.has(sIdx);
        const sectionHasActive = section.items.some((item) =>
          isItemActive(pathname, item.href)
        );
        const bodyH = PAD * 2 + section.items.length * rowHeight;

        return (
          <div
            key={section.label}
            className="branched-menu__section"
            data-open={isOpen ? "true" : "false"}
          >
            {/* Section Category Header */}
            <button
              ref={(el) => {
                heads.current[sIdx] = el;
              }}
              type="button"
              className="branched-menu__head"
              aria-expanded={isOpen}
              data-active={sectionHasActive ? "true" : "false"}
              onClick={() => toggle(sIdx)}
            >
              <span>{section.label}</span>
              <ChevronRight
                size={12}
                strokeWidth={2.5}
                className="branched-menu__chevron"
                aria-hidden="true"
              />
            </button>

            {/* Collapsible Children & Branch Lines */}
            <div className="branched-menu__body">
              <div className="branched-menu__fold">
                <div
                  className="branched-menu__tree"
                  style={{ height: `${bodyH}px` }}
                >
                  {/* SVG Branch Lines */}
                  <svg
                    className="branched-menu__lines"
                    width={indent}
                    height={bodyH}
                    aria-hidden="true"
                  >
                    {/* Vertical Trunk Line */}
                    <path
                      className="branched-menu__base"
                      d={`M ${trunk} 0 V ${rowY(section.items.length - 1) - r}`}
                    />

                    {/* Muted Base Branch Paths */}
                    {section.items.map((item, k) => (
                      <path
                        key={item.href}
                        className="branched-menu__base"
                        d={branch(k)}
                      />
                    ))}

                    {/* Animated Purple Glowing Reach Path */}
                    {section.items.map((item, k) => {
                      const isActive = isItemActive(pathname, item.href);
                      const pathLen = length(k);
                      return (
                        <path
                          key={item.href}
                          className="branched-menu__reach"
                          d={reach(k)}
                          style={{
                            strokeDasharray: pathLen,
                            strokeDashoffset: isActive ? 0 : pathLen,
                          }}
                        />
                      );
                    })}
                  </svg>

                  {/* Navigation Links */}
                  {section.items.map((item) => {
                    const isActive = isItemActive(pathname, item.href);
                    const Icon = item.icon;
                    const isAi = item.href.includes("smart");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        tabIndex={isOpen ? 0 : -1}
                        className="branched-menu__item"
                        aria-current={isActive ? "page" : undefined}
                        data-active={isActive ? "true" : "false"}
                        title={
                          item.status === "coming-soon"
                            ? `${item.label} — coming soon`
                            : item.label
                        }
                      >
                        <span
                          className="branched-menu__icon"
                          aria-hidden="true"
                        >
                          <Icon
                            size={15}
                            strokeWidth={isActive ? 2 : 1.75}
                          />
                        </span>

                        <span className="branched-menu__label">
                          {item.label}
                        </span>

                        {isAi && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <Sparkles size={9} className="text-purple-400" />
                            AI
                          </span>
                        )}

                        {item.status === "coming-soon" && (
                          <span className="text-[9px] font-medium text-slate-500 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                            Soon
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
