import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import slug from "slug";
import { api, ApiError } from "../api";
import type { Media, News, NewsBlock, NewsStatus } from "../types";
import { Button, Card, Pill } from "../ui";
import * as Icons from "../ui/Icons";
import BlockBody from "./news-editor/BlockBody";
import BlockInsert from "./news-editor/BlockInsert";
import BlockInspector from "./news-editor/BlockInspector";
import BlockRow from "./news-editor/BlockRow";
import MetadataPanel from "./news-editor/MetadataPanel";
import PublicationPanel, {
  type ScheduleMode,
} from "./news-editor/PublicationPanel";
import {
  blockIsEmpty,
  insertAfter,
  keyBlocks,
  type KeyedBlock,
  moveBlock,
  newBlock,
  removeBlock,
  stripKeys,
  updateBlock,
  wordCount,
} from "./news-editor/blocks";
import { useAutosave } from "./news-editor/useAutosave";

function modeFromStatus(status: NewsStatus): ScheduleMode {
  if (status === "scheduled") return "schedule";
  if (status === "published") return "publish-now";
  return "draft";
}

function statusFromMode(
  mode: ScheduleMode,
  currentStatus: NewsStatus | null,
): NewsStatus {
  if (mode === "publish-now") return "published";
  if (mode === "schedule") return "scheduled";
  return currentStatus === "withdrawn" ? "withdrawn" : "draft";
}

function statusPillTone(
  status: NewsStatus | null,
): "primary" | "accent" | "warn" | "mute" {
  if (status === "published") return "primary";
  if (status === "scheduled") return "warn";
  if (status === "withdrawn") return "accent";
  return "mute";
}

function statusLabel(status: NewsStatus | null): string {
  switch (status) {
    case "published":
      return "Veröffentlicht";
    case "scheduled":
      return "Geplant";
    case "withdrawn":
      return "Zurückgezogen";
    case "draft":
      return "Entwurf";
    default:
      return "Neu";
  }
}

function formatSavedAgo(savedAt: number | null, now: number): string {
  if (!savedAt) return "noch nicht gespeichert";
  const secs = Math.round((now - savedAt) / 1000);
  if (secs < 5) return "gerade gespeichert";
  if (secs < 60) return `gespeichert vor ${secs} Sek.`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `gespeichert vor ${mins} Min.`;
  return `gespeichert vor ${Math.floor(mins / 60)} Std.`;
}

export default function NewsEditPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = id !== undefined;

  const [loading, setLoading] = useState(editing);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [short, setShort] = useState("");
  const [tag, setTag] = useState("");
  const [slugVal, setSlugVal] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [blocks, setBlocks] = useState<KeyedBlock[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [insertAfterKey, setInsertAfterKey] = useState<string | null>(null);

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("draft");
  const [publishAt, setPublishAt] = useState("");
  const [status, setStatus] = useState<NewsStatus | null>(null);

  // Resolved Media rows for every image block that has a mediaId. Keyed by
  // numeric id so we can look up previews without refetching.
  const [mediaById, setMediaById] = useState<Map<number, Media>>(new Map());

  useEffect(() => {
    if (slugEdited) return;
    setSlugVal(slug(title, { lower: true }));
  }, [title, slugEdited]);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    api
      .get<News[]>(`/api/news`)
      .then((all) => {
        if (cancelled) return;
        const n = all.find((x) => x.id === Number(id));
        if (!n) {
          setGlobalError("Beitrag nicht gefunden.");
          setLoading(false);
          return;
        }
        setTitle(n.title);
        setShort(n.short);
        setTag(n.tag);
        setSlugVal(n.slug);
        setSlugEdited(true);
        setStatus(n.status);
        setScheduleMode(modeFromStatus(n.status));
        setPublishAt(n.publishAt?.slice(0, 16) ?? "");
        const initial = keyBlocks(
          n.blocks.length ? n.blocks : [newBlock("paragraph")],
        );
        setBlocks(initial);
        setActiveKey(initial[0]?.__key ?? null);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setGlobalError(String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  useEffect(() => {
    if (editing) return;
    if (blocks.length > 0) return;
    const seed = keyBlocks([newBlock("paragraph")]);
    setBlocks(seed);
    setActiveKey(seed[0].__key);
  }, [editing, blocks.length]);

  useEffect(() => {
    const unresolved = new Set<number>();
    for (const b of blocks) {
      if (b.kind === "image" && b.mediaId != null && !mediaById.has(b.mediaId)) {
        unresolved.add(b.mediaId);
      }
    }
    if (unresolved.size === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        [...unresolved].map((mid) =>
          api.get<Media>(`/api/media/${mid}`).catch(() => null),
        ),
      );
      if (cancelled) return;
      setMediaById((prev) => {
        const next = new Map(prev);
        results.forEach((m) => {
          if (m) next.set(m.id, m);
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [blocks, mediaById]);

  const activeBlock = useMemo(
    () => blocks.find((b) => b.__key === activeKey) ?? null,
    [blocks, activeKey],
  );

  const formState = useMemo(
    () => ({ title, short, tag, slugVal, blocks, scheduleMode, publishAt }),
    [title, short, tag, slugVal, blocks, scheduleMode, publishAt],
  );

  const buildPayload = useCallback(
    (opts: { mode: ScheduleMode; explicitStatus?: NewsStatus }) => {
      const effectiveStatus =
        opts.explicitStatus ?? statusFromMode(opts.mode, status);
      const payload: Record<string, unknown> = {
        title,
        tag,
        short,
        slug: slugVal || undefined,
        blocks: stripKeys(blocks),
        status: effectiveStatus,
        publishAt:
          opts.mode === "schedule" && publishAt
            ? new Date(publishAt).toISOString()
            : opts.mode === "publish-now"
              ? new Date().toISOString()
              : null,
      };
      return payload;
    },
    [title, tag, short, slugVal, blocks, publishAt, status],
  );

  const autosave = useAutosave({
    value: formState,
    delay: 800,
    enabled: editing && !loading,
    save: async () => {
      // Autosave syncs body + metadata but never flips publication state —
      // that's what the explicit "Veröffentlichen" / "Entwurf speichern"
      // buttons are for.
      const payload = buildPayload({
        mode: scheduleMode,
        explicitStatus: status ?? "draft",
      });
      delete payload.status;
      delete payload.publishAt;
      await api.patch(`/api/news/${id}`, payload);
    },
  });

  const setBlockActive = useCallback((key: string) => setActiveKey(key), []);

  const onMove = useCallback((key: string, dir: -1 | 1) => {
    setBlocks((bs) => moveBlock(bs, key, dir));
  }, []);

  const onRemove = useCallback(
    (key: string) => {
      setBlocks((bs) => {
        const next = removeBlock(bs, key);
        if (activeKey === key) setActiveKey(next[0]?.__key ?? null);
        return next;
      });
    },
    [activeKey],
  );

  const onUpdate = useCallback(
    (key: string, patch: Partial<NewsBlock>) => {
      setBlocks((bs) => updateBlock(bs, key, patch));
    },
    [],
  );

  const onInsert = useCallback(
    (afterKey: string | null, kind: NewsBlock["kind"]) => {
      setBlocks((bs) => {
        const { next, insertedKey } = insertAfter(bs, afterKey, kind);
        setActiveKey(insertedKey);
        return next;
      });
      setInsertAfterKey(null);
    },
    [],
  );

  const onPickMedia = useCallback((key: string, media: Media | null) => {
    setBlocks((bs) =>
      updateBlock(bs, key, { mediaId: media?.id ?? null, srcHint: undefined }),
    );
    if (media) {
      setMediaById((prev) => {
        const next = new Map(prev);
        next.set(media.id, media);
        return next;
      });
    }
  }, []);

  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || !editorRef.current?.contains(target)) return;

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Enter") {
        if (!activeKey) return;
        e.preventDefault();
        onInsert(activeKey, "paragraph");
        return;
      }

      if ((e.key === "Backspace" || e.key === "Delete") && activeKey) {
        if (
          !(
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLInputElement
          )
        )
          return;
        if (target.value !== "") return;
        const cur = blocks.find((b) => b.__key === activeKey);
        if (!cur || !blockIsEmpty(cur)) return;
        if (blocks.length <= 1) return;
        e.preventDefault();
        onRemove(activeKey);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeKey, blocks, onInsert, onRemove]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  const [saving, setSaving] = useState(false);

  async function saveAs(mode: ScheduleMode, explicitStatus?: NewsStatus) {
    if (!title.trim()) {
      setGlobalError("Titel darf nicht leer sein.");
      return;
    }
    setSaving(true);
    setGlobalError(null);
    try {
      const payload = buildPayload({ mode, explicitStatus });
      const saved = editing
        ? await api.patch<News>(`/api/news/${id}`, payload)
        : await api.post<News>(`/api/news`, payload);
      if (!editing) {
        nav(`/admin/news/${saved.id}`, { replace: true });
        return;
      }
      setStatus(saved.status);
      setScheduleMode(modeFromStatus(saved.status));
      setSlugVal(saved.slug);
      await autosave.flush();
    } catch (e) {
      if (e instanceof ApiError) setGlobalError(e.message);
      else setGlobalError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        className="px-10 py-20 text-center"
        style={{ color: "var(--ink-3)" }}
      >
        Lade…
      </div>
    );
  }

  return (
    <div ref={editorRef} className="page-enter">
      <div
        className="flex items-center gap-3 px-10 pt-7 text-[12.5px]"
        style={{ color: "var(--ink-3)" }}
      >
        <button
          type="button"
          onClick={() => nav("/admin/news")}
          className="flex items-center gap-1.5 hover:text-[color:var(--ink)]"
        >
          <Icons.Chevron size={12} stroke="currentColor" className="rotate-180" />
          Meldungen
        </button>
        <span>/</span>
        <span style={{ color: "var(--ink)" }}>Block-Editor</span>
      </div>

      <div className="px-10 pt-4 pb-14">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pill tone={statusPillTone(status)}>{statusLabel(status)}</Pill>
            <span
              className="font-mono text-[11.5px]"
              data-testid="editor-status-line"
              style={{ color: "var(--ink-4)" }}
            >
              {blocks.length} {blocks.length === 1 ? "Block" : "Blöcke"} ·{" "}
              {wordCount(blocks)} Wörter
              {editing
                ? ` · ${
                    autosave.status === "saving"
                      ? "speichert…"
                      : autosave.status === "error"
                        ? "Autosave fehlgeschlagen"
                        : formatSavedAgo(autosave.savedAt, now)
                  }`
                : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              kind="ghost"
              size="sm"
              leading={<Icons.Eye size={13} />}
              onClick={() => {
                if (status === "published") {
                  window.open(`/news/${slugVal}`, "_blank", "noopener");
                }
              }}
              disabled={status !== "published"}
              data-testid="editor-preview"
            >
              Vorschau
            </Button>
            <Button
              kind="ghost"
              size="sm"
              disabled={saving}
              onClick={() => saveAs("draft", "draft")}
              data-testid="editor-save-draft"
            >
              Entwurf speichern
            </Button>
            <Button
              kind="primary"
              size="sm"
              disabled={saving}
              onClick={() => saveAs(scheduleMode)}
              data-testid="editor-publish"
            >
              {scheduleMode === "schedule" ? "Planen" : "Veröffentlichen"}
            </Button>
          </div>
        </div>

        {globalError && (
          <div
            role="alert"
            className="mb-4 rounded-md px-3 py-2 text-[12px]"
            style={{
              border: "1px solid oklch(0.5 0.15 25 / 0.5)",
              background: "oklch(0.25 0.15 25 / 0.25)",
              color: "oklch(0.85 0.12 25)",
            }}
          >
            {globalError}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <Card padded={false}>
              <div className="p-8 pb-6">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titel…"
                  required
                  className="font-display w-full bg-transparent text-[38px] leading-[1.08] outline-none"
                  style={{ letterSpacing: "-0.02em" }}
                  data-testid="editor-title"
                />
                <input
                  value={short}
                  onChange={(e) => setShort(e.target.value)}
                  placeholder="Teaser…"
                  className="mt-3 w-full bg-transparent text-[15px] outline-none"
                  style={{ color: "var(--ink-2)" }}
                  data-testid="editor-teaser"
                />
              </div>
              <div className="space-y-0 px-8 pb-8">
                {blocks.map((b) => (
                  <div key={b.__key}>
                    <BlockRow
                      block={b}
                      active={b.__key === activeKey}
                      onActivate={() => setBlockActive(b.__key)}
                      onMove={(dir) => onMove(b.__key, dir)}
                      onRemove={() => onRemove(b.__key)}
                    >
                      <BlockBody
                        block={b}
                        onUpdate={(patch) => onUpdate(b.__key, patch)}
                        mediaForId={
                          b.kind === "image" && b.mediaId != null
                            ? (mediaById.get(b.mediaId) ?? null)
                            : null
                        }
                        onPickMedia={(m) => onPickMedia(b.__key, m)}
                      />
                    </BlockRow>
                    <BlockInsert
                      visible={insertAfterKey === b.__key}
                      onToggle={() =>
                        setInsertAfterKey((s) =>
                          s === b.__key ? null : b.__key,
                        )
                      }
                      onInsert={(kind) => onInsert(b.__key, kind)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="col-span-12 space-y-5 lg:col-span-4">
            <Card padded={false}>
              <div
                className="rule-b caps px-5 py-3 text-[10.5px]"
                style={{ color: "var(--ink-3)" }}
              >
                Block-Inspektor
              </div>
              <div className="p-5">
                <BlockInspector
                  block={activeBlock}
                  onUpdate={(patch) => activeKey && onUpdate(activeKey, patch)}
                />
              </div>
            </Card>

            <Card padded={false}>
              <div
                className="rule-b caps px-5 py-3 text-[10.5px]"
                style={{ color: "var(--ink-3)" }}
              >
                Veröffentlichung
              </div>
              <PublicationPanel
                mode={scheduleMode}
                onModeChange={setScheduleMode}
                publishAt={publishAt}
                onPublishAtChange={setPublishAt}
                currentStatus={status ?? undefined}
              />
            </Card>

            <Card padded={false}>
              <div
                className="rule-b caps px-5 py-3 text-[10.5px]"
                style={{ color: "var(--ink-3)" }}
              >
                Metadaten
              </div>
              <MetadataPanel
                tag={tag}
                onTagChange={setTag}
                slug={slugVal}
                onSlugChange={(v) => {
                  setSlugVal(v);
                  setSlugEdited(true);
                }}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
