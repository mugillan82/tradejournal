"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { SplitText as GSAPSplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(GSAPSplitText);
}

export interface ShuffleProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  shuffleDirection?: "left" | "right" | "up" | "down";
  duration?: number;
  maxDelay?: number;
  ease?: string | ((t: number) => number);
  onShuffleComplete?: () => void;
  shuffleTimes?: number;
  animationMode?: "random" | "evenodd";
  stagger?: number;
  scrambleCharset?: string;
  colorFrom?: string;
  colorTo?: string;
}

export const Shuffle: React.FC<ShuffleProps> = ({
  text,
  className = "",
  style = {},
  shuffleDirection = "right",
  duration = 0.45,
  maxDelay = 0,
  ease = "power3.out",
  onShuffleComplete,
  shuffleTimes = 1,
  animationMode = "evenodd",
  stagger = 0.02,
  scrambleCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  colorFrom = "#d946ef",
  colorTo = "#e2e8f0",
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const splitRef = useRef<GSAPSplitText | null>(null);
  const wrappersRef = useRef<HTMLElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined" && "fonts" in document) {
      if (document.fonts.status === "loaded") setFontsLoaded(true);
      else document.fonts.ready.then(() => setFontsLoaded(true));
    } else {
      setFontsLoaded(true);
    }
  }, []);

  const teardown = useCallback(() => {
    if (tlRef.current) {
      tlRef.current.kill();
      tlRef.current = null;
    }
    if (wrappersRef.current.length) {
      wrappersRef.current.forEach((wrap) => {
        const inner = wrap.firstElementChild as HTMLElement | null;
        const orig = inner?.querySelector('[data-orig="1"]') as HTMLElement | null;
        if (orig && wrap.parentNode) {
          wrap.parentNode.replaceChild(orig, wrap);
        }
      });
      wrappersRef.current = [];
    }
    try {
      splitRef.current?.revert();
    } catch {}
    splitRef.current = null;
  }, []);

  const animateShuffle = useCallback(() => {
    if (!ref.current || !text || !fontsLoaded) return;
    const el = ref.current;

    teardown();

    const computedFont = getComputedStyle(el).fontFamily;

    splitRef.current = new GSAPSplitText(el, {
      type: "chars,words",
      charsClass: "shuffle-char",
      wordsClass: "shuffle-word",
      smartWrap: true,
      reduceWhiteSpace: false,
    });

    const chars = (splitRef.current.chars || []) as HTMLElement[];
    wrappersRef.current = [];

    const rolls = Math.max(1, Math.floor(shuffleTimes));
    const rand = (set: string) =>
      set.charAt(Math.floor(Math.random() * set.length)) || "";
    const isVertical = shuffleDirection === "up" || shuffleDirection === "down";

    chars.forEach((ch) => {
      const parent = ch.parentElement;
      if (!parent) return;

      const rect = ch.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (!w || !h) return;

      const wrap = document.createElement("span");
      wrap.className = "inline-block overflow-hidden text-left align-baseline";
      Object.assign(wrap.style, {
        width: w + "px",
        height: h + "px",
        verticalAlign: "baseline",
      });

      const inner = document.createElement("span");
      inner.className =
        "inline-block will-change-transform origin-left transform-gpu " +
        (isVertical ? "whitespace-normal" : "whitespace-nowrap");

      parent.insertBefore(wrap, ch);
      wrap.appendChild(inner);

      const firstOrig = ch.cloneNode(true) as HTMLElement;
      firstOrig.className = "text-left inline-block";
      Object.assign(firstOrig.style, {
        width: w + "px",
        height: h + "px",
        lineHeight: h + "px",
        fontFamily: computedFont,
      });

      ch.setAttribute("data-orig", "1");
      ch.className = "text-left inline-block";
      Object.assign(ch.style, {
        width: w + "px",
        height: h + "px",
        lineHeight: h + "px",
        fontFamily: computedFont,
      });

      inner.appendChild(firstOrig);
      for (let k = 0; k < rolls; k++) {
        const c = ch.cloneNode(true) as HTMLElement;
        if (scrambleCharset) c.textContent = rand(scrambleCharset);
        c.className = "text-left inline-block";
        Object.assign(c.style, {
          width: w + "px",
          height: h + "px",
          lineHeight: h + "px",
          fontFamily: computedFont,
        });
        inner.appendChild(c);
      }
      inner.appendChild(ch);

      const steps = rolls + 1;

      if (shuffleDirection === "right" || shuffleDirection === "down") {
        const firstCopy = inner.firstElementChild as HTMLElement | null;
        const real = inner.lastElementChild as HTMLElement | null;
        if (real) inner.insertBefore(real, inner.firstChild);
        if (firstCopy) inner.appendChild(firstCopy);
      }

      let startX = 0;
      let finalX = 0;
      let startY = 0;
      let finalY = 0;

      if (shuffleDirection === "right") {
        startX = -steps * w;
        finalX = 0;
      } else if (shuffleDirection === "left") {
        startX = 0;
        finalX = -steps * w;
      } else if (shuffleDirection === "down") {
        startY = -steps * h;
        finalY = 0;
      } else if (shuffleDirection === "up") {
        startY = 0;
        finalY = -steps * h;
      }

      if (isVertical) {
        gsap.set(inner, { x: 0, y: startY, force3D: true });
        inner.setAttribute("data-start-y", String(startY));
        inner.setAttribute("data-final-y", String(finalY));
      } else {
        gsap.set(inner, { x: startX, y: 0, force3D: true });
        inner.setAttribute("data-start-x", String(startX));
        inner.setAttribute("data-final-x", String(finalX));
      }

      if (colorFrom) (inner.style as any).color = colorFrom;
      wrappersRef.current.push(wrap);
    });

    const strips = wrappersRef.current.map(
      (w) => w.firstElementChild as HTMLElement
    );
    if (!strips.length) return;

    const tl = gsap.timeline({
      smoothChildTiming: true,
      onComplete: () => {
        if (colorTo) gsap.set(strips, { color: colorTo });
        onShuffleComplete?.();
      },
    });

    const addTween = (targets: HTMLElement[], at: number) => {
      const vars: any = {
        duration,
        ease,
        force3D: true,
        stagger: animationMode === "evenodd" ? stagger : 0,
      };
      if (isVertical) {
        vars.y = (_: number, t: HTMLElement) =>
          parseFloat(t.getAttribute("data-final-y") || "0");
      } else {
        vars.x = (_: number, t: HTMLElement) =>
          parseFloat(t.getAttribute("data-final-x") || "0");
      }

      tl.to(targets, vars, at);

      if (colorFrom && colorTo) {
        tl.to(targets, { color: colorTo, duration, ease }, at);
      }
    };

    if (animationMode === "evenodd") {
      const odd = strips.filter((_, i) => i % 2 === 1);
      const even = strips.filter((_, i) => i % 2 === 0);
      const oddTotal = duration + Math.max(0, odd.length - 1) * stagger;
      const evenStart = odd.length ? oddTotal * 0.45 : 0;
      if (odd.length) addTween(odd, 0);
      if (even.length) addTween(even, evenStart);
    } else {
      strips.forEach((strip) => {
        const d = Math.random() * maxDelay;
        const vars: any = {
          duration,
          ease,
          force3D: true,
        };
        if (isVertical) {
          vars.y = parseFloat(strip.getAttribute("data-final-y") || "0");
        } else {
          vars.x = parseFloat(strip.getAttribute("data-final-x") || "0");
        }
        tl.to(strip, vars, d);
        if (colorFrom && colorTo) {
          tl.fromTo(
            strip,
            { color: colorFrom },
            { color: colorTo, duration, ease },
            d
          );
        }
      });
    }

    tlRef.current = tl;
  }, [
    text,
    fontsLoaded,
    teardown,
    shuffleDirection,
    shuffleTimes,
    duration,
    ease,
    animationMode,
    stagger,
    maxDelay,
    scrambleCharset,
    colorFrom,
    colorTo,
    onShuffleComplete,
  ]);

  useEffect(() => {
    animateShuffle();
    return () => teardown();
  }, [animateShuffle, teardown]);

  return (
    <p
      ref={ref}
      className={`inline-block whitespace-normal break-words will-change-transform text-center ${className}`}
      style={style}
    >
      {text}
    </p>
  );
};

export default Shuffle;
