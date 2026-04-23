import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { Button } from "../ui";
import logo from "../../assets/logo.svg";
import { CLUB_NAME } from "../shell/club";
import "../../styles/admin.css";

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
      await api.post("/api/auth/reset-consume", {
        token,
        newPassword: password,
      });
      setDone(true);
      setTimeout(() => nav("/admin/login", { replace: true }), 1500);
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Reset fehlgeschlagen.");
    }
  }

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="cs-card w-full max-w-sm p-8 relative">
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
            Passwort zurücksetzen
          </h1>
        </div>
        {done ? (
          <div
            className="rounded-md px-3 py-2 text-[12.5px]"
            style={{
              border: "1px solid oklch(0.5 0.16 160 / 0.5)",
              background: "oklch(0.25 0.14 160 / 0.25)",
              color: "oklch(0.88 0.1 160)",
            }}
          >
            Passwort gesetzt. Weiterleitung zur Anmeldung…
          </div>
        ) : (
          <>
            <label className="mb-3 block">
              <span
                className="mb-1 block text-[11px] caps"
                style={{ color: "var(--ink-3)" }}
              >
                Neues Passwort (min. 12 Zeichen)
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cs-input"
              />
            </label>
            <label className="mb-6 block">
              <span
                className="mb-1 block text-[11px] caps"
                style={{ color: "var(--ink-3)" }}
              >
                Bestätigung
              </span>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="cs-input"
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
              className="w-full justify-center"
            >
              Passwort speichern
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
