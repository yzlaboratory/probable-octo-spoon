import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { News, NewsStatus } from "../types";

const FILTERS: Array<{ key: string; label: string; query: string }> = [
  { key: "all", label: "Alle", query: "" },
  { key: "draft", label: "Entwurf", query: "?status=draft" },
  { key: "scheduled", label: "Geplant", query: "?status=scheduled" },
  { key: "published", label: "Veröffentlicht", query: "?status=published" },
  { key: "withdrawn", label: "Zurückgezogen", query: "?status=withdrawn" },
  { key: "deleted", label: "Papierkorb", query: "?status=deleted" },
];

const statusColor: Record<NewsStatus, string> = {
  draft: "bg-neutral-700 text-neutral-200",
  scheduled: "bg-amber-900 text-amber-200",
  published: "bg-emerald-900 text-emerald-200",
  withdrawn: "bg-neutral-800 text-neutral-400",
  deleted: "bg-red-950 text-red-300",
};

export default function NewsListPage() {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(key: string) {
    setLoading(true);
    const f = FILTERS.find((x) => x.key === key)!;
    const data = await api.get<News[]>(`/api/news${f.query}`);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { load(filter); }, [filter]);

  async function toggleStatus(n: News, nextStatus: NewsStatus) {
    await api.patch(`/api/news/${n.id}`, { status: nextStatus });
    load(filter);
  }

  async function softDelete(n: News) {
    if (!confirm(`„${n.title}" in den Papierkorb verschieben?`)) return;
    await api.delete(`/api/news/${n.id}`);
    load(filter);
  }

  async function hardDelete(n: News) {
    if (!confirm(`„${n.title}" endgültig löschen?`)) return;
    await api.delete(`/api/news/${n.id}`);
    load(filter);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">News</h1>
        <Link
          to="/admin/news/new"
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          + Neue Meldung
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs ${
              filter === f.key ? "bg-primary text-white" : "bg-neutral-800 text-neutral-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-sm border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-2">Datum</th>
              <th className="px-4 py-2">Titel</th>
              <th className="px-4 py-2">Tag</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  Lade…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  Keine Einträge.
                </td>
              </tr>
            )}
            {items.map((n) => (
              <tr key={n.id} className="border-t border-neutral-800 hover:bg-neutral-900/50">
                <td className="px-4 py-3 text-neutral-400">
                  {n.publishAt?.slice(0, 10) ?? n.createdAt.slice(0, 10)}
                </td>
                <td className="px-4 py-3 font-medium">{n.title}</td>
                <td className="px-4 py-3 text-neutral-400">{n.tag}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[n.status]}`}>
                    {n.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs">
                  <Link
                    to={`/admin/news/${n.id}`}
                    className="mx-1 text-neutral-300 hover:text-white"
                  >
                    Bearbeiten
                  </Link>
                  {n.status !== "deleted" && (
                    <button
                      onClick={() => softDelete(n)}
                      className="mx-1 text-neutral-300 hover:text-white"
                    >
                      Löschen
                    </button>
                  )}
                  {n.status === "deleted" && (
                    <button
                      onClick={() => hardDelete(n)}
                      className="mx-1 text-red-400 hover:text-red-200"
                    >
                      Endgültig löschen
                    </button>
                  )}
                  {n.status === "published" && (
                    <button
                      onClick={() => toggleStatus(n, "withdrawn")}
                      className="mx-1 text-neutral-300 hover:text-white"
                    >
                      Zurückziehen
                    </button>
                  )}
                  {(n.status === "withdrawn" || n.status === "draft") && (
                    <button
                      onClick={() => toggleStatus(n, "published")}
                      className="mx-1 text-neutral-300 hover:text-white"
                    >
                      Veröffentlichen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
