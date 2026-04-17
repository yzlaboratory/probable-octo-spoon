import { useEffect, useState } from "react";
import { api, ApiError } from "../api";

interface AdminRow {
  id: number;
  email: string;
  must_change_password: number;
  created_at: string;
}

export default function AdminsPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  async function load() {
    setRows(await api.get<AdminRow[]>("/api/auth/admins"));
  }
  useEffect(() => { load(); }, []);

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/auth/admins", { email, password, mustChangePassword: true });
      setEmail("");
      setPassword("");
      load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Fehler");
    }
  }

  async function issueReset(r: AdminRow) {
    try {
      const res = await api.post<{ token: string }>("/api/auth/reset-link", { email: r.email });
      setResetLink(`${window.location.origin}/admin/reset?token=${res.token}`);
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Fehler");
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-2xl font-bold">Administratoren</h1>
        <div className="overflow-hidden rounded-sm border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-4 py-2">E-Mail</th>
                <th className="px-4 py-2">Erstellt</th>
                <th className="px-4 py-2 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-neutral-800">
                  <td className="px-4 py-2 font-medium">
                    {r.email}
                    {r.must_change_password ? (
                      <span className="ml-2 rounded-full bg-amber-900 px-2 py-0.5 text-[10px] text-amber-200">
                        Passwort muss geändert werden
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-neutral-400">{r.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => issueReset(r)}
                      className="text-xs text-neutral-300 hover:text-white"
                    >
                      Passwort-Reset ausstellen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Neuer Administrator</h2>
        <form onSubmit={createAdmin} className="flex max-w-xl flex-col gap-3 rounded-sm border border-neutral-800 p-4">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">E-Mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Startpasswort (min. 12 Zeichen)</span>
            <input
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm font-mono"
            />
          </label>
          <button type="submit" className="self-start rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white">
            Administrator anlegen
          </button>
        </form>
      </section>

      {error && (
        <div role="alert" className="rounded-sm border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      {resetLink && (
        <div className="rounded-sm border border-emerald-800 bg-emerald-950 px-3 py-2 text-xs text-emerald-200">
          Einmalig verwendbarer Reset-Link — manuell weitergeben: <code className="font-mono">{resetLink}</code>
        </div>
      )}
    </div>
  );
}
