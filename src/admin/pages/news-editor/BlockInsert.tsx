import * as Icons from "../../ui/Icons";
import type { NewsBlockKind } from "../../types";

interface Props {
  visible: boolean;
  onToggle: () => void;
  onInsert: (kind: NewsBlockKind) => void;
}

const options: { kind: NewsBlockKind; label: string; icon: keyof typeof Icons }[] = [
  { kind: "paragraph", label: "Absatz", icon: "List" },
  { kind: "heading", label: "Überschrift", icon: "Heading" },
  { kind: "image", label: "Bild", icon: "Image" },
  { kind: "quote", label: "Zitat", icon: "Italic" },
  { kind: "callout", label: "Hinweiskasten", icon: "Tag" },
  { kind: "lead", label: "Einleitung", icon: "Bold" },
];

/**
 * The floating "+" that appears between blocks on hover. On click it pops up
 * a small picker listing every insertable block kind.
 */
export default function BlockInsert({ visible, onToggle, onInsert }: Props) {
  return (
    <div className="group relative flex h-3 items-center justify-center">
      <button
        type="button"
        aria-label="Block einfügen"
        onClick={onToggle}
        className="absolute -left-2 flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition group-hover:opacity-100 aria-expanded:opacity-100"
        style={{
          background: visible ? "var(--primary)" : "var(--paper-3)",
          border: "1px solid var(--rule-2)",
          opacity: visible ? 1 : undefined,
        }}
        aria-expanded={visible}
        data-testid="block-insert-toggle"
      >
        <Icons.Plus size={11} stroke={visible ? "#fff" : "var(--ink-2)"} />
      </button>
      {visible && (
        <div
          className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-md p-1.5"
          style={{
            background: "var(--paper-3)",
            border: "1px solid var(--rule-2)",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,.6)",
          }}
          role="menu"
          data-testid="block-insert-menu"
        >
          {options.map((o) => {
            const IconCmp = Icons[o.icon] as React.FC<{
              size?: number;
              stroke?: string;
            }>;
            return (
              <button
                key={o.kind}
                type="button"
                onClick={() => onInsert(o.kind)}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] hover:bg-[color:var(--paper-2)]"
                role="menuitem"
                data-testid={`block-insert-${o.kind}`}
              >
                <IconCmp size={12} stroke="var(--ink-2)" />
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
