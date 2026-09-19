"use client";

import React, { useEffect, useRef, useState } from "react";

export const TRADING_QUOTES = [
  "Patience is essential for trading. When there is nothing to do, do nothing.",
  "The goal of a successful trader is to make the best trades. Money is secondary",
  "Every trade you make is a lesson. Whether you win or lose, there’s always something to learn.",
  "The best traders have no ego",
  "Trade What's Happening… Not What You Think Is Gonna Happen",
];

const SHUFFLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

interface CharSlot {
  char: string;
  isShuffling: boolean;
}

interface ShuffleQuotesProps {
  quotes?: string[];
  shuffleDurationMs?: number;
  intervalMs?: number;
  className?: string;
}

export function ShuffleQuotes({
  quotes = TRADING_QUOTES,
  shuffleDurationMs = 950,
  intervalMs = 4000,
  className = "",
}: ShuffleQuotesProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displaySlots, setDisplaySlots] = useState<CharSlot[]>(() =>
    quotes[0].split("").map((c) => ({ char: c, isShuffling: false }))
  );

  const prevQuoteRef = useRef(quotes[0]);
  const animFrameRef = useRef<number | null>(null);

  // Set mounted flag on client to guarantee 100% SSR hydration match
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Shuffle animation on quote change
  useEffect(() => {
    if (!isMounted) return;

    const target = quotes[currentIndex];
    const from = prevQuoteRef.current;
    prevQuoteRef.current = target;

    const maxLen = Math.max(from.length, target.length);
    const startTime = performance.now();

    // Wave delays from left to right
    const resolveDelays = Array.from({ length: maxLen }, (_, i) => {
      const progress = i / maxLen;
      return Math.min(0.96, Math.max(0.04, progress * 0.82 + (Math.random() * 0.08)));
    });

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / shuffleDurationMs);

      const slots: CharSlot[] = [];

      for (let i = 0; i < maxLen; i++) {
        const charThreshold = resolveDelays[i];

        if (progress >= charThreshold) {
          // Settled on target character
          if (i < target.length) {
            slots.push({ char: target[i], isShuffling: false });
          }
        } else {
          // Shuffling letter
          if (i < target.length && target[i] === " ") {
            slots.push({ char: " ", isShuffling: false });
          } else if (i < target.length) {
            const randChar =
              SHUFFLE_CHARS[Math.floor(Math.random() * SHUFFLE_CHARS.length)];
            slots.push({ char: randChar, isShuffling: true });
          } else {
            // Trailing characters from previous longer quote dissolve
            const randChar =
              SHUFFLE_CHARS[Math.floor(Math.random() * SHUFFLE_CHARS.length)];
            slots.push({ char: randChar, isShuffling: true });
          }
        }
      }

      setDisplaySlots(slots);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplaySlots(
          target.split("").map((c) => ({ char: c, isShuffling: false }))
        );
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentIndex, isMounted, quotes, shuffleDurationMs]);

  // Continuous auto-rotation interval that runs reliably
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [quotes.length, intervalMs]);

  return (
    <div
      className={`relative w-full max-w-lg mx-auto flex flex-col items-center ${className}`}
      aria-live="polite"
      data-testid="shuffle-quotes-container"
    >
      {/* Min-height fixed wrapper to prevent Cumulative Layout Shift */}
      <div className="min-h-[5.5rem] sm:min-h-[4.25rem] flex items-center justify-center px-4 py-1 text-center">
        <p className="text-sm sm:text-base leading-relaxed tracking-normal transition-colors select-none">
          {displaySlots.map((slot, idx) =>
            slot.isShuffling ? (
              <span
                key={idx}
                className="text-purple-400 font-mono inline-block transform -translate-y-[1px] scale-105 font-bold drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all"
              >
                {slot.char}
              </span>
            ) : (
              <span key={idx} className="text-slate-200">
                {slot.char}
              </span>
            )
          )}
        </p>
      </div>

      {/* Quote indicator dots */}
      <div className="flex items-center gap-1.5 pt-3 pb-1">
        {quotes.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Jump to quote ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              idx === currentIndex
                ? "w-6 bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                : "w-1.5 bg-slate-700 hover:bg-slate-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
