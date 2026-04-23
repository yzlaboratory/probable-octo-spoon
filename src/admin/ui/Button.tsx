import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonKind = "primary" | "ghost" | "accent" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  kind?: ButtonKind;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-4 text-[13px]",
  lg: "h-10 px-5 text-[13.5px]",
};

export function Button({
  children,
  kind = "ghost",
  size = "md",
  leading,
  trailing,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`btn-${kind} cs-focus inline-flex items-center gap-2 ${SIZES[size]} rounded-md font-medium ${className}`.trim()}
      style={{ borderRadius: 8, ...(rest.style ?? {}) }}
      data-kind={kind}
      data-size={size}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
