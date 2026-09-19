"use client";

import React, { type CSSProperties } from "react";

export interface GlitchTextProps {
  children?: React.ReactNode;
  text?: string;
  speed?: number;
  enableShadows?: boolean;
  enableOnHover?: boolean;
  className?: string;
  backgroundColor?: string;
  offset?: number;
  as?: React.ElementType;
}

interface CustomCSSProperties extends CSSProperties {
  "--after-duration"?: string;
  "--before-duration"?: string;
  "--after-shadow"?: string;
  "--before-shadow"?: string;
  "--glitch-offset"?: string;
  "--glitch-bg"?: string;
}

export function GlitchText({
  children,
  text,
  speed = 0.8,
  enableShadows = true,
  enableOnHover = false,
  className = "",
  backgroundColor = "#020617",
  offset,
  as: Component = "span",
}: GlitchTextProps) {
  const displayText = text || (typeof children === "string" ? children : "KAIVO");
  const shadowOffset = offset ?? 3;

  const inlineStyles: CustomCSSProperties = {
    "--after-duration": `${Number((speed * 3).toFixed(2))}s`,
    "--before-duration": `${Number((speed * 2).toFixed(2))}s`,
    "--after-shadow": enableShadows ? `-${shadowOffset}px 0 #ef4444` : "none",
    "--before-shadow": enableShadows ? `${shadowOffset}px 0 #06b6d4` : "none",
    "--glitch-offset": `${shadowOffset}px`,
    "--glitch-bg": backgroundColor,
  };

  const hoverClass = enableOnHover ? "glitch-hover" : "";
  const combinedClasses = `glitch-text ${hoverClass} ${className}`.trim();

  return (
    <Component
      style={inlineStyles}
      data-text={displayText}
      className={combinedClasses}
    >
      {children ?? displayText}
    </Component>
  );
}

export default GlitchText;
