import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import logo from "../../assets/logo.svg";

export default function ResetPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    try {
      await api.post("/api/auth/reset-consume", { token, newPassword: password });
      setDone(true);
      setTimeout(() => nav("/admin/login", { replace: true }), 1500);
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Reset fehlgeschlagen.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] text-neutral-100">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-sm border border-neutral-800 bg-neutral-900 p-8">
        <div className="mb-6 flex flex-col items-center">
          <img src={logo} alt="Clubwappen" className="mb-3 h-16 w-16" />
          <h1 className="text-xl font-bold tracking-wide">Passwort zurücksetzen</h1>
        </div>
        {done ? (
          <div className="rounded-sm border border-emerald-800 bg-emerald-950 px-3 py-2 text-xs text-emerald-200">
            Passwort gesetzt. Weiterleitung zur Anmeldung…
          </div>
        ) : (
          <>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs text-neutral-400">Neues Passwort (min. 12 Zeichen)</span>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
            </label>
            <label className="mb-6 block">
              <span className="mb-1 block text-xs text-neutral-400">Bestätigung</span>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
            </label>
            {error && (
              <div role="alert" className="mb-4 rounded-sm border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
            <button type="submit" className="w-full rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white">
              Passwort speichern
            </button>
          </>
        )}
      </form>
    </div>
  );
}
