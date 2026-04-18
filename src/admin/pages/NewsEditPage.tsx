import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import slug from "slug";
import { api, ApiError } from "../api";
import type { News, NewsStatus, Media } from "../types";
import RichTextEditor from "../components/RichTextEditor";
import MediaUploader from "../components/MediaUploader";

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
      .get<News>(`/api/news/public/${id}`)
      .catch(() => null)
      .then(async () => {
        // Fetch via admin list + filter is cleaner; simpler: admin GET /api/news, find by id.
        const all = await api.get<News[]>(`/api/news`);
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
          n.status === "scheduled" ? "schedule" : n.status === "published" ? "publish-now" : "draft",
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
        scheduleMode === "draft" ? "draft" : scheduleMode === "publish-now" ? "published" : "scheduled",
      publishAt:
        scheduleMode === "schedule" && publishAt
          ? new Date(publishAt).toISOString()
          : scheduleMode === "publish-now"
            ? new Date().toISOString()
            : null,
    };
    // When editing an existing post, keep withdrawn state if selected.
    if (editing && status === "withdrawn" && scheduleMode === "draft") payload.status = "withdrawn";
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

  if (loading) return <div className="text-neutral-500">Lade…</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{editing ? "Meldung bearbeiten" : "Neue Meldung"}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPreview((p) => !p)}
            className="rounded-sm border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            {preview ? "Bearbeiten" : "Vorschau"}
          </button>
          <Link to="/admin/news" className="rounded-sm border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800">
            Abbrechen
          </Link>
        </div>
      </div>

      {preview ? (
        <article className="rounded-sm border border-neutral-800 bg-neutral-950 p-8">
          {hero && (
            <img
              src={hero.variants["1600w"] || hero.variants["800w"] || hero.variants.fallbackJpg}
              alt=""
              className="mb-6 w-full rounded-sm"
            />
          )}
          <div className="mb-1 text-xs uppercase tracking-wider text-primary">{tag}</div>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="mt-2 text-neutral-400">{short}</p>
          <div
            className="prose prose-invert mt-6 max-w-none"
            dangerouslySetInnerHTML={{ __html: longHtml }}
          />
        </article>
      ) : (
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">Titel</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">Tag</span>
              <input
                required
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">Kurzfassung</span>
              <textarea
                required
                rows={3}
                value={short}
                onChange={(e) => setShort(e.target.value)}
                className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm"
              />
            </label>
            <div>
              <div className="mb-1 text-xs text-neutral-400">Langtext</div>
              <RichTextEditor value={longHtml} onChange={setLongHtml} />
            </div>
          </div>

          <aside className="space-y-4">
            <MediaUploader kind="news" value={hero} onChange={setHero} label="Titelbild" />
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">Slug</span>
              <input
                value={slugVal}
                onChange={(e) => {
                  setSlugVal(e.target.value);
                  setSlugEdited(true);
                }}
                className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm font-mono"
              />
            </label>
            <fieldset className="rounded-sm border border-neutral-800 p-3">
              <legend className="px-2 text-xs text-neutral-400">Status</legend>
              {(
                [
                  { v: "draft" as ScheduleMode, label: "Entwurf" },
                  { v: "publish-now" as ScheduleMode, label: "Sofort veröffentlichen" },
                  { v: "schedule" as ScheduleMode, label: "Planen" },
                ] as const
              ).map((o) => (
                <label key={o.v} className="mb-1 flex items-center gap-2 text-sm">
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
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm"
                />
              )}
            </fieldset>
            {error && (
              <div role="alert" className="rounded-sm border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Speichern
            </button>
          </aside>
        </form>
      )}
    </div>
  );
}
