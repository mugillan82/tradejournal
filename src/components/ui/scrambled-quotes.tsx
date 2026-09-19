"use client";

import React, { useEffect, useRef, useState } from "react";

export const TRADING_QUOTES = [
  "Patience is essential for trading. When there is nothing to do, do nothing.",
  "The goal of a successful trader is to make the best trades. Money is secondary",
  "Every trade you make is a lesson. Whether you win or lose, there’s always something to learn.",
  "The best traders have no ego",
  "Trade What's Happening… Not What You Think Is Gonna Happen",
];

const GLYPHS = "ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?~/";

interface CharacterState {
  char: string;
  isScrambled: boolean;
}

interface ScrambledQuotesProps {
  quotes?: string[];
  scrambleDurationMs?: number;
  intervalMs?: number;
  className?: string;
}

export function ScrambledQuotes({
  quotes = TRADING_QUOTES,
  scrambleDurationMs = 1100,
  intervalMs = 3800,
  className = "",
}: ScrambledQuotesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayChars, setDisplayChars] = useState<CharacterState[]>(() =>
    quotes[0].split("").map((c) => ({ char: c, isScrambled: false }))
  );

  const prevTextRef = useRef(quotes[0]);
  const animFrameRef = useRef<number | null>(null);

  // Scramble animation triggered whenever currentIndex changes
  useEffect(() => {
    const targetText = quotes[currentIndex];
    const fromText = prevTextRef.current;
    prevTextRef.current = targetText;

    const maxLength = Math.max(fromText.length, targetText.length);
    const startTime = performance.now();

    // Random resolve thresholds per character for organic wave reveal
    const thresholds = Array.from({ length: maxLength }, (_, i) => {
      const base = (i / maxLength) * 0.85;
      const jitter = (Math.random() - 0.5) * 0.15;
      return Math.min(0.98, Math.max(0.05, base + jitter));
    });

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / scrambleDurationMs);

      const nextChars: CharacterState[] = [];

      for (let i = 0; i < maxLength; i++) {
        if (progress >= thresholds[i]) {
          if (i < targetText.length) {
            nextChars.push({ char: targetText[i], isScrambled: false });
          }
        } else {
          if (i < targetText.length && targetText[i] === " ") {
            nextChars.push({ char: " ", isScrambled: false });
          } else if (i < targetText.length) {
            const rand = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            nextChars.push({ char: rand, isScrambled: true });
          } else {
            // Dissolving characters from previous longer quote
            const rand = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            nextChars.push({ char: rand, isScrambled: true });
          }
        }
      }

      setDisplayChars(nextChars);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayChars(
          targetText.split("").map((c) => ({ char: c, isScrambled: false }))
        );
      }
    };

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [currentIndex, quotes, scrambleDurationMs]);

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
      data-testid="scrambled-quotes-container"
    >
      {/* Min-height fixed wrapper to prevent Cumulative Layout Shift */}
      <div className="min-h-[5.5rem] sm:min-h-[4.25rem] flex items-center justify-center px-4 py-1 text-center">
        <p className="text-sm sm:text-base leading-relaxed tracking-normal transition-colors select-none">
          {displayChars.map((item, idx) =>
            item.isScrambled ? (
              <span
                key={idx}
                className="text-purple-400 font-mono inline-block transform scale-105 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-transform"
              >
                {item.char}
              </span>
            ) : (
              <span key={idx} className="text-slate-300">
                {item.char}
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
