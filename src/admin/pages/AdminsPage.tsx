import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { Button, Card, PageHeader, Pill } from "../ui";
import * as Icons from "../ui/Icons";

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
  useEffect(() => {
    load();
  }, []);

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/auth/admins", {
        email,
        password,
        mustChangePassword: true,
      });
      setEmail("");
      setPassword("");
      load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Fehler");
    }
  }

  async function issueReset(r: AdminRow) {
    try {
      const res = await api.post<{ token: string }>("/api/auth/reset-link", {
        email: r.email,
      });
      setResetLink(`${window.location.origin}/admin/reset?token=${res.token}`);
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Fehler");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Konto"
        title="Administratoren"
        subtitle="Wer darf Inhalte bearbeiten, und wer benötigt ein Passwort-Reset."
      />

      <div className="px-10 pb-10 space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-md px-3 py-2 text-[12.5px]"
            style={{
              border: "1px solid oklch(0.5 0.15 25 / 0.5)",
              background: "oklch(0.25 0.15 25 / 0.25)",
              color: "oklch(0.85 0.12 25)",
            }}
          >
            {error}
          </div>
        )}

        {resetLink && (
          <div
            className="rounded-md px-4 py-3 text-[12.5px]"
            style={{
              border: "1px solid oklch(0.5 0.16 160 / 0.5)",
              background: "oklch(0.25 0.14 160 / 0.25)",
              color: "oklch(0.88 0.1 160)",
            }}
          >
            Einmalig verwendbarer Reset-Link — manuell weitergeben:
            <div className="font-mono text-[11.5px] mt-1 break-all">
              {resetLink}
            </div>
          </div>
        )}

        <Card padded={false} className="overflow-hidden">
          <div
            className="grid text-[10.5px] caps rule-b"
            style={{
              gridTemplateColumns: "1fr 180px 180px",
              color: "var(--ink-3)",
            }}
          >
            <div className="px-5 py-3">E-Mail</div>
            <div className="px-5 py-3">Erstellt</div>
            <div className="px-5 py-3 text-right">Aktion</div>
          </div>
          {rows.map((r) => (
            <div
              key={r.id}
              className="grid items-center"
              style={{
                gridTemplateColumns: "1fr 180px 180px",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <div className="px-5 py-3 min-w-0 flex items-center gap-2">
                <span
                  className="font-mono text-[13px] truncate"
                  style={{ color: "var(--ink)" }}
                >
                  {r.email}
                </span>
                {r.must_change_password ? (
                  <Pill tone="warn">Passwort-Reset fällig</Pill>
                ) : null}
              </div>
              <div
                className="px-5 py-3 font-mono text-[12px]"
                style={{ color: "var(--ink-2)" }}
              >
                {r.created_at.slice(0, 10)}
              </div>
              <div className="px-5 py-3 flex justify-end">
                <Button
                  kind="ghost"
                  size="sm"
                  leading={<Icons.Link size={12} />}
                  onClick={() => issueReset(r)}
                >
                  Reset-Link ausstellen
                </Button>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div
              className="px-5 py-8 text-center text-[12.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Keine Administratoren erfasst.
            </div>
          )}
        </Card>

        <Card>
          <div
            className="caps text-[10.5px] mb-3"
            style={{ color: "var(--ink-3)" }}
          >
            Neuer Administrator
          </div>
          <form
            onSubmit={createAdmin}
            className="grid gap-3 max-w-xl"
            style={{ gridTemplateColumns: "1fr" }}
          >
            <label className="block">
              <span
                className="mb-1 block text-[11px] caps"
                style={{ color: "var(--ink-3)" }}
              >
                E-Mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cs-input"
              />
            </label>
            <label className="block">
              <span
                className="mb-1 block text-[11px] caps"
                style={{ color: "var(--ink-3)" }}
              >
                Startpasswort (min. 12 Zeichen)
              </span>
              <input
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cs-input font-mono"
              />
            </label>
            <div>
              <Button kind="primary" size="md" type="submit">
                Administrator anlegen
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
