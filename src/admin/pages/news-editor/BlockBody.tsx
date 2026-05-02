import { useEffect, useRef } from "react";
import type { NewsBlock, Media } from "../../types";
import MediaUploader from "../../components/MediaUploader";
import * as Icons from "../../ui/Icons";

interface Props {
  block: NewsBlock;
  onUpdate: (patch: Partial<NewsBlock>) => void;
  /** Currently-resolved media for image blocks, so the editor can show a preview. */
  mediaForId?: Media | null;
  onPickMedia?: (m: Media | null) => void;
}

/**
 * Textarea that auto-sizes to its content. Used by every text-bearing block so
 * authors never see a scroll bar inside the editor.
 */
function AutoGrow({
  value,
  onChange,
  className,
  placeholder,
  style,
  minRows = 1,
  dataTestid,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  minRows?: number;
  dataTestid?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full resize-none bg-transparent outline-none ${className ?? ""}`}
      placeholder={placeholder}
      style={style}
      data-testid={dataTestid}
    />
  );
}

export default function BlockBody({ block, onUpdate, mediaForId, onPickMedia }: Props) {
  if (block.kind === "heading") {
    const size =
      block.level === 1
        ? "text-[34px]"
        : block.level === 2
          ? "text-[26px]"
          : "text-[20px]";
    return (
      <AutoGrow
        value={block.text}
        onChange={(v) => onUpdate({ text: v })}
        placeholder={`Überschrift H${block.level}…`}
        className={`font-display leading-tight ${size}`}
        style={{ letterSpacing: "-0.015em" }}
        dataTestid="block-heading"
      />
    );
  }
  if (block.kind === "lead") {
    return (
      <AutoGrow
        value={block.text}
        onChange={(v) => onUpdate({ text: v })}
        minRows={2}
        placeholder="Einleitungstext…"
        className="text-[17px] leading-[1.5]"
        style={{ color: "var(--ink-2)", fontFamily: "Newsreader, serif" }}
        dataTestid="block-lead"
      />
    );
  }
  if (block.kind === "paragraph") {
    return (
      <AutoGrow
        value={block.text}
        onChange={(v) => onUpdate({ text: v })}
        minRows={2}
        placeholder="Absatz…"
        className="text-[15px] leading-[1.65]"
        style={{ fontFamily: "Newsreader, serif" }}
        dataTestid="block-paragraph"
      />
    );
  }
  if (block.kind === "quote") {
    return (
      <div
        className="py-1 pl-5"
        style={{ borderLeft: "3px solid var(--accent)" }}
      >
        <AutoGrow
          value={block.text}
          onChange={(v) => onUpdate({ text: v })}
          minRows={2}
          placeholder="Zitat…"
          className="font-display text-[22px] italic leading-[1.35]"
          dataTestid="block-quote-text"
        />
        <input
          value={block.attr}
          onChange={(e) => onUpdate({ attr: e.target.value })}
          placeholder="Attribution (Name)…"
          className="mt-2 w-full bg-transparent font-mono text-[12px] outline-none"
          style={{ color: "var(--ink-3)" }}
          data-testid="block-quote-attr"
        />
      </div>
    );
  }
  if (block.kind === "callout") {
    const toneVar =
      block.tone === "accent"
        ? "var(--accent)"
        : block.tone === "warn"
          ? "var(--warn)"
          : "var(--primary)";
    return (
      <div
        className="flex items-start gap-3 rounded-md p-4"
        style={{
          background: "oklch(0.62 0.22 290 / 0.1)",
          border: `1px solid ${toneVar}`,
        }}
      >
        <div
          className="w-1 shrink-0 self-stretch rounded-full"
          style={{ background: toneVar, boxShadow: "0 0 8px var(--glow)" }}
        />
        <AutoGrow
          value={block.text}
          onChange={(v) => onUpdate({ text: v })}
          placeholder="Hinweis…"
          className="flex-1 text-[13.5px] font-medium"
          dataTestid="block-callout"
        />
      </div>
    );
  }
  if (block.kind === "image") {
    const preview =
      mediaForId?.variants["800w"] ||
      mediaForId?.variants["400w"] ||
      block.srcHint ||
      "";
    return (
      <div>
        {preview ? (
          <div className="overflow-hidden rounded-md" style={{ border: "1px solid var(--rule-2)" }}>
            <img src={preview} alt={block.caption} className="block w-full" />
          </div>
        ) : (
          <div
            className="flex aspect-[16/9] items-center justify-center rounded-md"
            style={{
              border: "1px dashed var(--rule-2)",
              background:
                "repeating-linear-gradient(-45deg, var(--paper-2), var(--paper-2) 6px, var(--paper) 6px, var(--paper) 12px)",
            }}
          >
            <div className="text-center">
              <Icons.Image size={22} stroke="var(--primary-2)" />
              <div className="mt-2 text-[12px] font-medium" style={{ color: "var(--primary-2)" }}>
                Bild aus Mediathek wählen
              </div>
            </div>
          </div>
        )}
        <div className="mt-3">
          <MediaUploader
            kind="news"
            value={mediaForId ?? null}
            onChange={(m) => onPickMedia?.(m)}
            label=""
          />
        </div>
        <input
          value={block.caption}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          placeholder="Bildunterschrift…"
          className="mt-2 w-full bg-transparent text-[12.5px] italic outline-none"
          style={{ color: "var(--ink-2)" }}
          data-testid="block-image-caption"
        />
        <input
          value={block.credit}
          onChange={(e) => onUpdate({ credit: e.target.value })}
          placeholder="Bildnachweis…"
          className="mt-1 w-full bg-transparent font-mono text-[11px] outline-none"
          style={{ color: "var(--ink-3)" }}
          data-testid="block-image-credit"
        />
      </div>
    );
  }
  return null;
}
