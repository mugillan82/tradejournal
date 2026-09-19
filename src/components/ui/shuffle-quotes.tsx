"use client";

import React, { useEffect, useState } from "react";
import { Shuffle } from "./shuffle";

export const TRADING_QUOTES = [
  "Patience is essential for trading. When there is nothing to do, do nothing.",
  "The goal of a successful trader is to make the best trades. Money is secondary",
  "Every trade you make is a lesson. Whether you win or lose, there’s always something to learn.",
  "The best traders have no ego",
  "Trade What's Happening… Not What You Think Is Gonna Happen",
];

interface ShuffleQuotesProps {
  quotes?: string[];
  intervalMs?: number;
  className?: string;
}

export function ShuffleQuotes({
  quotes = TRADING_QUOTES,
  intervalMs = 4500,
  className = "",
}: ShuffleQuotesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

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
        <Shuffle
          key={currentIndex}
          text={quotes[currentIndex]}
          shuffleDirection="right"
          duration={0.4}
          stagger={0.02}
          animationMode="evenodd"
          shuffleTimes={1}
          colorFrom="#d946ef"
          colorTo="#e2e8f0"
          className="text-sm sm:text-base leading-relaxed tracking-normal text-slate-300 font-medium"
        />
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
