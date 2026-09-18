"use client";

/**
 * React Bits — Stroke Text Component
 *
 * Outlined letterforms draw themselves on with a stroke animation,
 * followed by a flood or wipe of the fill color.
 */

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface StrokeTextProps {
  text: string;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  drawDuration?: number;
  fillDelay?: number;
  stagger?: number;
  ease?: string;
  trigger?: "mount" | "hover" | "loop" | "scroll";
  replayOnHover?: boolean;
  fillMode?: "wipe" | "fade" | "none";
  fontSize?: number;
  fontWeight?: number | string;
  letterSpacing?: number;
  reverse?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function StrokeText({
  text = "Trading Command Center",
  strokeColor = "#818cf8",
  fillColor = "#f8fafc",
  strokeWidth = 1.2,
  drawDuration = 1.2,
  fillDelay = 0.15,
  stagger = 0.04,
  ease = "power2.out",
  trigger = "mount",
  replayOnHover = false,
  fillMode = "wipe",
  fontSize = 24,
  fontWeight = 700,
  letterSpacing = -0.5,
  reverse = false,
  className = "",
  style = {},
}: StrokeTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const strokeTextRef = useRef<SVGTextElement>(null);
  const wipeRectRef = useRef<SVGRectElement>(null);

  const rawId = useId();
  const wipeId = `stroke-text-wipe-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const characters = useMemo(() => Array.from(String(text ?? "")), [text]);
  const dash = Math.max(fontSize * 7, 200);

  const fontStyle = useMemo(
    () => ({
      fontSize: `${fontSize}px`,
      fontWeight,
      letterSpacing: `${letterSpacing}px`,
      fontFamily: "inherit",
    }),
    [fontSize, fontWeight, letterSpacing],
  );

  // Safe default bounding box for SSR or environments without SVG getBBox (e.g. happy-dom / tests)
  const defaultBox = useMemo(() => {
    const charCount = characters.length || 1;
    const estimatedWidth = Math.round(charCount * fontSize * 0.58);
    const estimatedHeight = Math.round(fontSize * 1.3);
    return {
      x: 0,
      y: Math.round(-fontSize * 0.85),
      width: Math.max(estimatedWidth, 60),
      height: estimatedHeight,
    };
  }, [characters.length, fontSize]);

  const [box, setBox] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const node = strokeTextRef.current;
    if (!node) {
      setBox(defaultBox);
      return;
    }

    let cancelled = false;

    const measure = () => {
      if (cancelled || !strokeTextRef.current) return;
      let bbox: DOMRect | SVGRect | null = null;
      try {
        if (typeof strokeTextRef.current.getBBox === "function") {
          bbox = strokeTextRef.current.getBBox();
        }
      } catch {
        // Fallback for jsdom / happy-dom
      }

      if (!bbox || !bbox.width || bbox.width <= 0) {
        setBox(defaultBox);
        return;
      }

      const pad = Math.max(Number(strokeWidth) || 1, fontSize * 0.1);
      const next = {
        x: Math.round(bbox.x - pad),
        y: Math.round(bbox.y - pad),
        width: Math.round(bbox.width + pad * 2),
        height: Math.round(bbox.height + pad * 2),
      };

      setBox((prev) =>
        prev &&
        Math.abs(prev.x - next.x) < 0.5 &&
        Math.abs(prev.width - next.width) < 0.5 &&
        Math.abs(prev.y - next.y) < 0.5
          ? prev
          : next,
      );
    };

    measure();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [characters, fontSize, fontWeight, letterSpacing, strokeWidth, defaultBox]);

  useEffect(() => {
    const root = rootRef.current;
    if (typeof window === "undefined" || !root || !box) return undefined;

    const strokes = gsap.utils.toArray<SVGElement>(root.querySelectorAll("[data-stroke-char]"));
    const fills = gsap.utils.toArray<SVGElement>(root.querySelectorAll("[data-fill-char]"));
    const wipe = wipeRectRef.current;
    if (!strokes.length) return undefined;

    const fillEnabled = fillMode !== "none";
    const useWipe = fillEnabled && fillMode === "wipe";
    const fillDuration = Math.max(0.35, drawDuration * 0.45);
    const staggerConfig = reverse ? { each: stagger, from: "end" as const } : stagger;
    const targets = [...strokes, ...fills, wipe].filter(Boolean);

    const setStart = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash });
      gsap.set(fills, { opacity: useWipe ? 1 : 0 });
      if (wipe) gsap.set(wipe, { attr: { width: 0 } });
    };

    const setEnd = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 });
      gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
      if (wipe) gsap.set(wipe, { attr: { width: fillEnabled ? box.width : 0 } });
    };

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setEnd();
      return () => gsap.killTweensOf(targets);
    }

    const build = () => {
      setStart();
      const tl = gsap.timeline({
        paused: true,
        repeat: trigger === "loop" ? -1 : 0,
        repeatDelay: trigger === "loop" ? 0.9 : 0,
        defaults: { overwrite: "auto" },
      });

      tl.to(
        strokes,
        { strokeDashoffset: 0, duration: drawDuration, ease, stagger: staggerConfig },
        0,
      );

      if (useWipe && wipe) {
        tl.to(
          wipe,
          { attr: { width: box.width }, duration: fillDuration, ease: "power2.inOut" },
          drawDuration + fillDelay,
        );
      } else if (fillEnabled) {
        tl.to(
          fills,
          { opacity: 1, duration: fillDuration, ease: "power2.out", stagger: staggerConfig },
          drawDuration + fillDelay,
        );
      }

      return tl;
    };

    let timeline: gsap.core.Timeline | null = null;
    let scrollTrigger: ScrollTrigger | null = null;
    let removeHover: (() => void) | null = null;

    if (trigger === "hover") {
      setEnd();
      const play = () => {
        timeline?.kill();
        timeline = build();
        timeline.play(0);
      };
      root.addEventListener("pointerenter", play);
      removeHover = () => root.removeEventListener("pointerenter", play);
    } else {
      timeline = build();
      if (trigger === "scroll") {
        scrollTrigger = ScrollTrigger.create({
          trigger: root,
          start: "top 85%",
          once: true,
          onEnter: () => timeline?.play(0),
        });
      } else {
        timeline.play(0);
      }

      if (replayOnHover) {
        const play = () => {
          timeline?.kill();
          timeline = build();
          timeline.play(0);
        };
        root.addEventListener("pointerenter", play);
        removeHover = () => root.removeEventListener("pointerenter", play);
      }
    }

    return () => {
      removeHover?.();
      scrollTrigger?.kill();
      timeline?.kill();
      gsap.killTweensOf(targets);
    };
  }, [box, dash, drawDuration, fillDelay, stagger, ease, trigger, replayOnHover, fillMode, reverse]);

  const currentBox = box || defaultBox;
  const viewBox = `${currentBox.x} ${currentBox.y} ${currentBox.width} ${currentBox.height}`;

  return (
    <span
      ref={rootRef}
      className={`inline-block select-none leading-none ${
        trigger === "hover" || replayOnHover ? "cursor-pointer" : ""
      } ${className}`.trim()}
      style={{
        ...style,
        height: `${Math.round(fontSize * 1.25)}px`,
        maxWidth: "100%",
      }}
      role="img"
      aria-label={String(text ?? "")}
    >
      {/* Screen reader text ensures high accessibility and test compatibility */}
      <span className="sr-only">{text}</span>

      <svg
        className="block h-full w-auto max-w-full overflow-visible"
        viewBox={viewBox}
        preserveAspectRatio="xMinYMid meet"
        aria-hidden="true"
        style={{ height: `${Math.round(fontSize * 1.25)}px` }}
      >
        {fillMode === "wipe" && (
          <defs>
            <clipPath id={wipeId} clipPathUnits="userSpaceOnUse">
              <rect
                ref={wipeRectRef}
                x={currentBox.x}
                y={currentBox.y}
                width="0"
                height={currentBox.height}
              />
            </clipPath>
          </defs>
        )}

        {/* Outline Stroke Text */}
        <text
          ref={strokeTextRef}
          x="0"
          y="0"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={fontStyle}
        >
          {characters.map((char, index) => (
            <tspan data-stroke-char key={`s-${index}`}>
              {char}
            </tspan>
          ))}
        </text>

        {/* Filled Text */}
        <text
          x="0"
          y="0"
          fill={fillColor}
          stroke="none"
          style={fontStyle}
          clipPath={fillMode === "wipe" ? `url(#${wipeId})` : undefined}
        >
          {characters.map((char, index) => (
            <tspan data-fill-char key={`f-${index}`}>
              {char}
            </tspan>
          ))}
        </text>
      </svg>
    </span>
  );
}

export default StrokeText;
