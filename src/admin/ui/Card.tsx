import type { CSSProperties, ElementType, ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** HTML element tag to render. Defaults to <div>. */
  as?: ElementType;
  /** When false, no padding is applied — useful when the card wraps a table. */
  padded?: boolean;
}

export function Card({
  children,
  className = "",
  style,
  as: Tag = "div",
  padded = true,
}: CardProps) {
  return (
    <Tag
      className={`cs-card ${padded ? "p-5" : ""} ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}
