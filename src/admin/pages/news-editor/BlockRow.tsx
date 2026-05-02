import type { ReactNode } from "react";
import * as Icons from "../../ui/Icons";
import type { NewsBlock } from "../../types";

interface Props {
  block: NewsBlock;
  active: boolean;
  onActivate: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  children: ReactNode;
}

/**
 * The surrounding chrome for a single block: hover-only reorder + delete
 * handles on the gutters, an active-state rail on the left, and a kind
 * abbreviation shown to help authors navigate long articles.
 */
export default function BlockRow({
  block,
  active,
  onActivate,
  onMove,
  onRemove,
  children,
}: Props) {
  return (
    <div
      onClick={onActivate}
      className="group relative -mx-3 cursor-text rounded-md px-3 py-2"
      style={{
        background: active ? "oklch(0.62 0.22 290 / 0.05)" : "transparent",
      }}
      data-testid="block-row"
      data-active={active ? "true" : "false"}
      data-kind={block.kind}
    >
      <div className="absolute -left-[42px] top-2 flex flex-col gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          aria-label="Block nach oben verschieben"
          onClick={(e) => {
            e.stopPropagation();
            onMove(-1);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{
            background: "var(--paper-3)",
            border: "1px solid var(--rule-2)",
          }}
          data-testid="block-move-up"
        >
          <span style={{ fontSize: 10, color: "var(--ink-2)" }}>▲</span>
        </button>
        <button
          type="button"
          aria-label="Block nach unten verschieben"
          onClick={(e) => {
            e.stopPropagation();
            onMove(1);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{
            background: "var(--paper-3)",
            border: "1px solid var(--rule-2)",
          }}
          data-testid="block-move-down"
        >
          <span style={{ fontSize: 10, color: "var(--ink-2)" }}>▼</span>
        </button>
      </div>

      <div className="absolute -right-[36px] top-2 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          aria-label="Block entfernen"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{
            background: "var(--paper-3)",
            border: "1px solid var(--rule-2)",
          }}
          data-testid="block-remove"
        >
          <Icons.Trash size={11} stroke="var(--accent)" />
        </button>
      </div>

      {active && (
        <div
          className="absolute bottom-2 -left-2 top-2 w-0.5 rounded-full"
          style={{
            background: "var(--primary)",
            boxShadow: "0 0 8px var(--glow)",
          }}
        />
      )}

      <div
        className="caps absolute -left-8 top-3 font-mono text-[9px] opacity-0 transition group-hover:opacity-100"
        style={{ color: "var(--ink-4)" }}
      >
        {block.kind.slice(0, 3)}
      </div>

      {children}
    </div>
  );
}
