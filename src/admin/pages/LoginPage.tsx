import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { ApiError } from "../api";
import logo from "../../assets/logo.svg";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (loc.state as { from?: string } | null)?.from ?? "/admin/news";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      nav(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Anmeldung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] text-neutral-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-sm border border-neutral-800 bg-neutral-900 p-8"
      >
        <div className="mb-6 flex flex-col items-center">
          <img src={logo} alt="Clubwappen" className="mb-3 h-16 w-16" />
          <h1 className="text-xl font-bold tracking-wide">Admin-Bereich</h1>
        </div>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-neutral-400">E-Mail</span>
          <input
            type="email"
            required
            autoComplete="username"
            className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="mb-6 block">
          <span className="mb-1 block text-xs text-neutral-400">Passwort</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <div role="alert" className="mb-4 rounded-sm border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Anmelden…" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
