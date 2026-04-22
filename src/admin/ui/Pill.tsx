import type { ReactNode } from "react";

export type PillTone =
  | "neutral"
  | "primary"
  | "accent"
  | "warn"
  | "tertiary"
  | "mute";

interface ToneSpec {
  bg: string;
  fg: string;
  dot: string;
}

const TONES: Record<PillTone, ToneSpec> = {
  neutral: { bg: "var(--paper-3)", fg: "var(--ink-2)", dot: "var(--ink-3)" },
  primary: {
    bg: "oklch(0.62 0.22 290 / 0.15)",
    fg: "oklch(0.8 0.18 290)",
    dot: "var(--primary)",
  },
  accent: {
    bg: "oklch(0.72 0.19 25 / 0.15)",
    fg: "oklch(0.82 0.16 25)",
    dot: "var(--accent)",
  },
  warn: {
    bg: "oklch(0.78 0.16 85 / 0.15)",
    fg: "oklch(0.86 0.14 85)",
    dot: "var(--warn)",
  },
  tertiary: {
    bg: "oklch(0.58 0.22 330 / 0.18)",
    fg: "oklch(0.78 0.2 330)",
    dot: "var(--tertiary)",
  },
  mute: { bg: "transparent", fg: "var(--ink-3)", dot: "var(--ink-4)" },
};

export interface PillProps {
  children: ReactNode;
  tone?: PillTone;
  /** Render without the leading dot for a plainer appearance. */
  dot?: boolean;
  className?: string;
}

export function Pill({
  children,
  tone = "neutral",
  dot = true,
  className = "",
}: PillProps) {
  const t = TONES[tone];
  return (
    <span
      className={`chip ${className}`.trim()}
      style={{
        background: t.bg,
        color: t.fg,
        border: tone === "mute" ? "1px solid var(--rule-2)" : undefined,
      }}
      data-tone={tone}
    >
      {dot && <span className="chip-dot" style={{ background: t.dot }} />}
      {children}
    </span>
  );
}
