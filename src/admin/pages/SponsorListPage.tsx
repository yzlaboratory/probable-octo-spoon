import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Sponsor, SponsorStatus } from "../types";

const FILTERS: Array<{ key: string; label: string; query: string }> = [
  { key: "all", label: "Alle", query: "" },
  { key: "active", label: "Aktiv", query: "?status=active" },
  { key: "paused", label: "Pausiert", query: "?status=paused" },
  { key: "archived", label: "Archiviert", query: "?status=archived" },
];

const statusColor: Record<SponsorStatus, string> = {
  active: "bg-emerald-900 text-emerald-200",
  paused: "bg-amber-900 text-amber-200",
  archived: "bg-neutral-800 text-neutral-400",
};

export default function SponsorListPage() {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(key: string) {
    setLoading(true);
    const f = FILTERS.find((x) => x.key === key)!;
    const data = await api.get<Sponsor[]>(`/api/sponsors${f.query}`);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { load(filter); }, [filter]);

  async function setStatus(s: Sponsor, status: SponsorStatus) {
    await api.patch(`/api/sponsors/${s.id}`, { status });
    load(filter);
  }

  async function hardDelete(s: Sponsor) {
    const typed = window.prompt(`Zur Bestätigung den Namen eingeben: „${s.name}"`);
    if (typed !== s.name) return;
    await api.delete(`/api/sponsors/${s.id}`);
    load(filter);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sponsoren</h1>
        <Link
          to="/admin/sponsors/new"
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          + Neuer Sponsor
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
              <th className="px-4 py-2">Logo</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Gewicht</th>
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
                  Keine Sponsoren.
                </td>
              </tr>
            )}
            {items.map((s) => (
              <tr key={s.id} className="border-t border-neutral-800 hover:bg-neutral-900/50">
                <td className="px-4 py-2">
                  {s.logo?.variants["200w"] || s.logo?.variants.svg ? (
                    <img
                      src={s.logo.variants["200w"] || s.logo.variants.svg}
                      alt=""
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-neutral-500">—</span>
                  )}
                </td>
                <td className="px-4 py-2 font-medium">
                  {s.name}
                  {s.tagline && <div className="text-xs text-neutral-500">{s.tagline}</div>}
                </td>
                <td className="px-4 py-2 text-neutral-400">{s.weight}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[s.status]}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-xs">
                  <Link to={`/admin/sponsors/${s.id}`} className="mx-1 text-neutral-300 hover:text-white">
                    Bearbeiten
                  </Link>
                  {s.status === "active" && (
                    <button onClick={() => setStatus(s, "paused")} className="mx-1 text-neutral-300 hover:text-white">
                      Pausieren
                    </button>
                  )}
                  {s.status === "paused" && (
                    <button onClick={() => setStatus(s, "active")} className="mx-1 text-neutral-300 hover:text-white">
                      Aktivieren
                    </button>
                  )}
                  {s.status !== "archived" && (
                    <button onClick={() => setStatus(s, "archived")} className="mx-1 text-neutral-300 hover:text-white">
                      Archivieren
                    </button>
                  )}
                  {s.status === "archived" && (
                    <>
                      <button onClick={() => setStatus(s, "active")} className="mx-1 text-neutral-300 hover:text-white">
                        Reaktivieren
                      </button>
                      <button onClick={() => hardDelete(s)} className="mx-1 text-red-400 hover:text-red-200">
                        Endgültig löschen
                      </button>
                    </>
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
