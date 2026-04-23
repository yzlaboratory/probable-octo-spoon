import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import slug from "slug";
import { api, ApiError } from "../api";
import type { News, NewsStatus, Media } from "../types";
import RichTextEditor from "../components/RichTextEditor";
import MediaUploader from "../components/MediaUploader";
import { Button, Card, PageHeader } from "../ui";
import * as Icons from "../ui/Icons";

type ScheduleMode = "draft" | "publish-now" | "schedule";

export default function NewsEditPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = id !== undefined;
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [short, setShort] = useState("");
  const [longHtml, setLongHtml] = useState("");
  const [hero, setHero] = useState<Media | null>(null);
  const [slugVal, setSlugVal] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("draft");
  const [publishAt, setPublishAt] = useState("");
  const [status, setStatus] = useState<NewsStatus>("draft");

  useEffect(() => {
    if (!editing) return;
    api
      .get<News[]>(`/api/news`)
      .then((all) => {
        const n = all.find((x) => x.id === Number(id));
        if (!n) {
          setError("Beitrag nicht gefunden.");
          setLoading(false);
          return;
        }
        setTitle(n.title);
        setTag(n.tag);
        setShort(n.short);
        setLongHtml(n.longHtml);
        setHero(n.hero);
        setSlugVal(n.slug);
        setSlugEdited(true);
        setStatus(n.status);
        setPublishAt(n.publishAt?.slice(0, 16) ?? "");
        setScheduleMode(
          n.status === "scheduled"
            ? "schedule"
            : n.status === "published"
              ? "publish-now"
              : "draft",
        );
        setLoading(false);
      })
      .catch((e) => setError(String(e)));
  }, [editing, id]);

  useEffect(() => {
    if (!slugEdited) setSlugVal(slug(title, { lower: true }));
  }, [title, slugEdited]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = {
      title,
      tag,
      short,
      longHtml,
      slug: slugVal || undefined,
      heroMediaId: hero?.id ?? null,
      status:
        scheduleMode === "draft"
          ? "draft"
          : scheduleMode === "publish-now"
            ? "published"
            : "scheduled",
      publishAt:
        scheduleMode === "schedule" && publishAt
          ? new Date(publishAt).toISOString()
          : scheduleMode === "publish-now"
            ? new Date().toISOString()
            : null,
    };
    if (editing && status === "withdrawn" && scheduleMode === "draft")
      payload.status = "withdrawn";
    try {
      if (editing) {
        await api.patch(`/api/news/${id}`, payload);
      } else {
        await api.post("/api/news", payload);
      }
      nav("/admin/news");
    } catch (e2) {
      if (e2 instanceof ApiError) setError(e2.message);
      else setError("Speichern fehlgeschlagen.");
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
    <div>
      <PageHeader
        eyebrow={editing ? "Bearbeiten" : "Neu"}
        title={editing ? title || "Meldung bearbeiten" : "Neue Meldung"}
        subtitle={
          editing
            ? "Änderungen werden beim Speichern übernommen."
            : "Titel und Text sind erforderlich."
        }
        right={
          <>
            <Button
              kind="ghost"
              size="md"
              leading={
                preview ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />
              }
              onClick={() => setPreview((p) => !p)}
            >
              {preview ? "Bearbeiten" : "Vorschau"}
            </Button>
            <Button kind="ghost" size="md" onClick={() => nav("/admin/news")}>
              Abbrechen
            </Button>
          </>
        }
      />

      <div className="px-10 pb-10">
        {preview ? (
          <Card>
            {hero && (
              <img
                src={
                  hero.variants["1600w"] ||
                  hero.variants["800w"] ||
                  hero.variants.fallbackJpg
                }
                alt=""
                className="mb-6 w-full rounded"
              />
            )}
            <div
              className="caps text-[10.5px] mb-1"
              style={{ color: "var(--accent)" }}
            >
              {tag}
            </div>
            <h2
              className="font-display text-[36px]"
              style={{ letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
            <p className="mt-2" style={{ color: "var(--ink-2)" }}>
              {short}
            </p>
            <div
              className="prose prose-invert mt-6 max-w-none"
              style={{ color: "var(--ink)" }}
              dangerouslySetInnerHTML={{ __html: longHtml }}
            />
          </Card>
        ) : (
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]"
          >
            <div className="space-y-4">
              <Card>
                <label className="block mb-3">
                  <span
                    className="mb-1 block text-[11px] caps"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Titel
                  </span>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="cs-input"
                  />
                </label>
                <label className="block mb-3">
                  <span
                    className="mb-1 block text-[11px] caps"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Tag
                  </span>
                  <input
                    required
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="cs-input"
                  />
                </label>
                <label className="block">
                  <span
                    className="mb-1 block text-[11px] caps"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Kurzfassung
                  </span>
                  <textarea
                    required
                    rows={3}
                    value={short}
                    onChange={(e) => setShort(e.target.value)}
                    className="cs-input"
                  />
                </label>
              </Card>
              <Card>
                <div
                  className="caps text-[10.5px] mb-2"
                  style={{ color: "var(--ink-3)" }}
                >
                  Langtext
                </div>
                <RichTextEditor value={longHtml} onChange={setLongHtml} />
              </Card>
            </div>

            <aside className="space-y-4">
              <Card>
                <div
                  className="caps text-[10.5px] mb-2"
                  style={{ color: "var(--ink-3)" }}
                >
                  Titelbild
                </div>
                <MediaUploader
                  kind="news"
                  value={hero}
                  onChange={setHero}
                  label=""
                />
              </Card>
              <Card>
                <label className="block mb-3">
                  <span
                    className="mb-1 block text-[11px] caps"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Slug
                  </span>
                  <input
                    value={slugVal}
                    onChange={(e) => {
                      setSlugVal(e.target.value);
                      setSlugEdited(true);
                    }}
                    className="cs-input font-mono"
                  />
                </label>
                <fieldset
                  className="rounded-md p-3"
                  style={{ border: "1px solid var(--rule-2)" }}
                >
                  <legend
                    className="px-2 text-[10.5px] caps"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Status
                  </legend>
                  {(
                    [
                      { v: "draft" as ScheduleMode, label: "Entwurf" },
                      {
                        v: "publish-now" as ScheduleMode,
                        label: "Sofort veröffentlichen",
                      },
                      { v: "schedule" as ScheduleMode, label: "Planen" },
                    ] as const
                  ).map((o) => (
                    <label
                      key={o.v}
                      className="mb-1 flex items-center gap-2 text-[13px]"
                    >
                      <input
                        type="radio"
                        name="schedule"
                        checked={scheduleMode === o.v}
                        onChange={() => setScheduleMode(o.v)}
                      />
                      {o.label}
                    </label>
                  ))}
                  {scheduleMode === "schedule" && (
                    <input
                      type="datetime-local"
                      required
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                      className="cs-input mt-2"
                    />
                  )}
                </fieldset>
              </Card>
              {error && (
                <div
                  role="alert"
                  className="rounded-md px-3 py-2 text-[12px]"
                  style={{
                    border: "1px solid oklch(0.5 0.15 25 / 0.5)",
                    background: "oklch(0.25 0.15 25 / 0.25)",
                    color: "oklch(0.85 0.12 25)",
                  }}
                >
                  {error}
                </div>
              )}
              <Button
                type="submit"
                kind="primary"
                size="lg"
                className="w-full justify-center"
              >
                Speichern
              </Button>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
