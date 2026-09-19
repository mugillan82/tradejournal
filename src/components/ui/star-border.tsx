import React from "react";

export type StarBorderProps<T extends React.ElementType> =
  React.ComponentPropsWithoutRef<T> & {
    as?: T;
    className?: string;
    children?: React.ReactNode;
    color?: string;
    speed?: React.CSSProperties["animationDuration"];
    thickness?: number;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
  };

export function StarBorder<T extends React.ElementType = "button">({
  as,
  className = "",
  color = "#d946ef",
  speed = "6.5s",
  thickness = 2.5,
  backgroundColor = "#09090b",
  textColor = "#ffffff",
  borderColor = "rgba(255, 255, 255, 0.12)",
  children,
  ...rest
}: StarBorderProps<T>) {
  const Component = as || "button";

  return (
    <Component
      className={`relative inline-block overflow-hidden rounded-[20px] select-none transition-all duration-200 ${className}`}
      {...(rest as any)}
      style={{
        padding: `${thickness}px`,
        ...(rest as any).style,
      }}
    >
      <div
        className="absolute w-[300%] h-[60%] opacity-100 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 22%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="absolute w-[300%] h-[60%] opacity-100 top-[-10px] left-[-250%] rounded-full animate-star-movement-top z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 22%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="relative z-10 border text-center text-sm font-semibold py-2.5 px-6 rounded-[18px] transition-colors"
        style={{
          background: backgroundColor,
          color: textColor,
          borderColor,
        }}
      >
        {children}
      </div>
    </Component>
  );
}

export default StarBorder;
