import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Small caps label above the title (often the section or status). */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned slot, typically a row of Buttons. */
  right?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`px-10 pt-10 pb-6 ${className}`.trim()}>
      {eyebrow && (
        <div
          className="caps text-[10.5px] mb-3"
          style={{ color: "var(--accent)" }}
        >
          {eyebrow}
        </div>
      )}
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1 max-w-[640px]">
          <h1
            className="font-display text-[44px] leading-[1.05]"
            style={{ letterSpacing: "-0.015em" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-3 text-[14.5px]"
              style={{ color: "var(--ink-2)", textWrap: "pretty" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {right && (
          <div className="flex items-center gap-2 shrink-0">{right}</div>
        )}
      </div>
    </div>
  );
}
