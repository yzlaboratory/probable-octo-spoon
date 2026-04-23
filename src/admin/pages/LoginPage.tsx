import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { ApiError } from "../api";
import { Button } from "../ui";
import logo from "../../assets/logo.svg";
import { CLUB_NAME } from "../shell/club";
import "../../styles/admin.css";

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
    <div className="admin-shell flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="cs-card w-full max-w-sm p-8 relative"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={logo}
            alt=""
            className="mb-4 w-16 h-16 rounded-lg"
            style={{ boxShadow: "0 0 24px var(--glow)" }}
          />
          <div
            className="caps text-[10.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            {CLUB_NAME}
          </div>
          <h1
            className="font-display text-[28px] mt-1"
            style={{ letterSpacing: "-0.015em" }}
          >
            Admin-Bereich
          </h1>
        </div>
        <label className="mb-4 block">
          <span
            className="mb-1 block text-[11px] caps"
            style={{ color: "var(--ink-3)" }}
          >
            E-Mail
          </span>
          <input
            type="email"
            required
            autoComplete="username"
            className="cs-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="mb-6 block">
          <span
            className="mb-1 block text-[11px] caps"
            style={{ color: "var(--ink-3)" }}
          >
            Passwort
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="cs-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md px-3 py-2 text-[12px]"
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
          disabled={submitting}
          className="w-full justify-center"
        >
          {submitting ? "Anmelden…" : "Anmelden"}
        </Button>
      </form>
    </div>
  );
}
