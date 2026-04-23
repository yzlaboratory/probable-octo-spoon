import type { NewsBlock, CalloutTone } from "../../types";

interface Props {
  block: NewsBlock | null;
  onUpdate: (patch: Partial<NewsBlock>) => void;
}

/**
 * Right-rail panel showing kind-specific controls for the active block
 * (heading level, callout tone). Neutral when nothing is selected.
 */
export default function BlockInspector({ block, onUpdate }: Props) {
  if (!block) {
    return (
      <div className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
        Block anklicken…
      </div>
    );
  }

  return (
    <div className="space-y-3 text-[12.5px]" data-testid="block-inspector">
      <div className="flex items-center justify-between">
        <span
          className="caps text-[10px]"
          style={{ color: "var(--ink-3)" }}
        >
          Typ
        </span>
        <span className="font-mono" data-testid="inspector-kind">
          {block.kind}
        </span>
      </div>

      {block.kind === "heading" && (
        <div>
          <div
            className="caps mb-1.5 text-[10px]"
            style={{ color: "var(--ink-3)" }}
          >
            Ebene
          </div>
          <div className="grid grid-cols-3 gap-1">
            {([1, 2, 3] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onUpdate({ level: l } as Partial<NewsBlock>)}
                className="h-8 rounded-md text-[12px]"
                style={{
                  background:
                    block.level === l ? "var(--primary)" : "var(--paper-3)",
                  color: block.level === l ? "#fff" : "var(--ink-2)",
                  border: "1px solid var(--rule)",
                }}
                data-testid={`inspector-heading-level-${l}`}
              >
                H{l}
              </button>
            ))}
          </div>
        </div>
      )}

      {block.kind === "callout" && (
        <div>
          <div
            className="caps mb-1.5 text-[10px]"
            style={{ color: "var(--ink-3)" }}
          >
            Farbton
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(["primary", "accent", "warn"] as const).map((t: CalloutTone) => (
              <button
                key={t}
                type="button"
                onClick={() => onUpdate({ tone: t } as Partial<NewsBlock>)}
                className="h-8 rounded-md text-[11px]"
                style={{
                  background: `var(--${t})`,
                  color: "#fff",
                  opacity: block.tone === t ? 1 : 0.4,
                }}
                data-testid={`inspector-callout-tone-${t}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="rule-t pt-3 text-[11px]"
        style={{ color: "var(--ink-3)" }}
      >
        <kbd>⌘ ⇧ ⏎</kbd> fügt Absatz darunter ein · <kbd>⌫</kbd> entfernt leere Blöcke
      </div>
    </div>
  );
}
