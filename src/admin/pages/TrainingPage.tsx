import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api, ApiError } from "../api";
import type {
  TrainingBanner,
  TrainingDay,
  TrainingSlot,
  TrainingStatus,
  TrainingVisibility,
} from "../types";
import { Button, Card, PageHeader, Pill } from "../ui";
import type { PillTone } from "../ui/Pill";
import * as Icons from "../ui/Icons";

const DAYS_IN_ORDER: TrainingDay[] = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

const VISIBILITIES: TrainingVisibility[] = [
  "offen für Gäste",
  "Anmeldung erforderlich",
  "nur Mitglieder",
];

// "archived" still exists in the DB enum so legacy rows don't break, but it is
// not exposed in the admin UI any more — Löschen is offered directly instead.
type EditableStatus = Exclude<TrainingStatus, "archived">;

interface FilterSpec {
  key: EditableStatus;
  label: string;
}

const FILTERS: FilterSpec[] = [
  { key: "active", label: "Aktiv" },
  { key: "hidden", label: "Verborgen" },
];

const STATUS_TONES: Record<EditableStatus, PillTone> = {
  active: "primary",
  hidden: "warn",
};

const STATUS_LABELS: Record<EditableStatus, string> = {
  active: "Aktiv",
  hidden: "Verborgen",
};

const VISIBILITY_TONES: Record<TrainingVisibility, PillTone> = {
  "offen für Gäste": "primary",
  "Anmeldung erforderlich": "warn",
  "nur Mitglieder": "mute",
};

function SlotRow(props: {
  slot: TrainingSlot;
  onEdit: () => void;
  onChangeStatus: (s: EditableStatus) => void;
  onHardDelete: () => void;
}) {
  const { slot, onEdit, onChangeStatus, onHardDelete } = props;
  const tone = STATUS_TONES[slot.status as EditableStatus] ?? "mute";
  const label = STATUS_LABELS[slot.status as EditableStatus] ?? slot.status;
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-md p-3"
      style={{
        background: "var(--paper)",
        border: "1px solid var(--rule)",
      }}
    >
      <div
        className="shrink-0 font-mono text-[12px] tabular-nums"
        style={{ color: "var(--ink-2)", minWidth: 92 }}
      >
        {slot.timeFrom}–{slot.timeTo}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="font-display truncate text-[15px]"
          style={{ color: "var(--ink)" }}
          title={slot.group}
        >
          {slot.group}
        </div>
        <div
          className="truncate text-[11.5px]"
          style={{ color: "var(--ink-3)" }}
        >
          {slot.trainer} · {slot.phone}
        </div>
      </div>
      <Pill tone={VISIBILITY_TONES[slot.visibility]}>{slot.visibility}</Pill>
      <Pill tone={tone}>{label}</Pill>
      <div className="flex flex-wrap gap-1">
        <Button kind="ghost" size="sm" onClick={onEdit}>
          Bearbeiten
        </Button>
        {slot.status !== "hidden" && (
          <Button
            kind="ghost"
            size="sm"
            onClick={() => onChangeStatus("hidden")}
          >
            Verbergen
          </Button>
        )}
        {slot.status !== "active" && (
          <Button
            kind="ghost"
            size="sm"
            onClick={() => onChangeStatus("active")}
          >
            Anzeigen
          </Button>
        )}
        <Button kind="danger" size="sm" onClick={onHardDelete}>
          Löschen
        </Button>
      </div>
    </div>
  );
}

function BannerEditor(props: {
  banner: TrainingBanner;
  onSaved: (banner: TrainingBanner) => void;
}) {
  const { banner, onSaved } = props;
  const [message, setMessage] = useState(banner.message ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the textarea in sync if the parent reloads after another action.
  useEffect(() => {
    setMessage(banner.message ?? "");
  }, [banner.message]);

  const dirty = (banner.message ?? "") !== message;

  async function save(nextMessage: string | null) {
    setSaving(true);
    setError(null);
    try {
      const next = await api.patch<TrainingBanner>("/api/training/banner", {
        message: nextMessage,
      });
      onSaved(next);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div
            className="caps mb-1 text-[10.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            Saisonbanner
          </div>
          <div className="text-[13px]" style={{ color: "var(--ink-2)" }}>
            Wird oben über dem Trainingsplan angezeigt. Leer lassen, um den
            Banner auszublenden.
          </div>
        </div>
        {banner.message ? (
          <Pill tone="warn">sichtbar</Pill>
        ) : (
          <Pill tone="mute">aus</Pill>
        )}
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={280}
        placeholder="z. B. Sommerpause bis 9. August"
        className="cs-input"
      />
      {error && (
        <div
          role="alert"
          className="mt-2 rounded-md px-3 py-2 text-[12px]"
          style={{
            border: "1px solid oklch(0.5 0.15 25 / 0.5)",
            background: "oklch(0.25 0.15 25 / 0.25)",
            color: "oklch(0.85 0.12 25)",
          }}
        >
          {error}
        </div>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        {banner.message && (
          <Button
            kind="ghost"
            size="sm"
            onClick={() => save(null)}
            disabled={saving}
          >
            Banner ausblenden
          </Button>
        )}
        <Button
          kind="primary"
          size="sm"
          onClick={() => save(message)}
          disabled={saving || !dirty}
        >
          {saving ? "Speichere…" : "Speichern"}
        </Button>
      </div>
    </Card>
  );
}

export default function TrainingPage() {
  const [filter, setFilter] = useState<EditableStatus>("active");
  const [all, setAll] = useState<TrainingSlot[]>([]);
  const [banner, setBanner] = useState<TrainingBanner>({
    message: null,
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<
    null | { mode: "new" } | { mode: "edit"; slot: TrainingSlot }
  >(null);

  async function load() {
    setLoading(true);
    const [slots, b] = await Promise.all([
      api.get<TrainingSlot[]>("/api/training"),
      api.get<TrainingBanner>("/api/training/banner"),
    ]);
    setAll(slots);
    setBanner(b);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      active: all.filter((s) => s.status === "active").length,
      hidden: all.filter((s) => s.status === "hidden").length,
    }),
    [all],
  );

  // Legacy archived rows are still hidden from both filter tabs; admin can
  // delete them via the API directly if needed.
  const visible = all.filter((s) => s.status === filter);

  const byDay: Record<TrainingDay, TrainingSlot[]> = useMemo(() => {
    const grouped = Object.fromEntries(
      DAYS_IN_ORDER.map((d) => [d, [] as TrainingSlot[]]),
    ) as Record<TrainingDay, TrainingSlot[]>;
    for (const s of visible) grouped[s.day].push(s);
    for (const d of DAYS_IN_ORDER) {
      grouped[d].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
    }
    return grouped;
  }, [visible]);

  async function changeStatus(slot: TrainingSlot, status: EditableStatus) {
    // Optimistic local update — full reload here makes the entire grid flash
    // through its "Lade…" placeholder while the PATCH round-trips.
    const updated = await api.patch<TrainingSlot>(`/api/training/${slot.id}`, {
      status,
    });
    setAll((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
  }

  async function hardDelete(slot: TrainingSlot) {
    const typed = window.prompt(
      `Zur Bestätigung den Gruppennamen eingeben: „${slot.group}"`,
    );
    if (typed !== slot.group) return;
    await api.delete(`/api/training/${slot.id}`);
    setAll((prev) => prev.filter((s) => s.id !== slot.id));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Trainingsplan"
        title="Training"
        subtitle="Wöchentliche Trainingszeiten, Trainerinnen und Trainer, sowie der Saisonbanner für die öffentliche Seite."
        right={
          <Button
            kind="primary"
            size="md"
            leading={<Icons.Plus size={14} />}
            onClick={() => setDialog({ mode: "new" })}
          >
            Neuer Trainingseintrag
          </Button>
        }
      />

      <div className="space-y-6 px-10 pb-10">
        <BannerEditor banner={banner} onSaved={(b) => setBanner(b)} />

        <Card padded={false}>
          <div className="rule-b flex flex-wrap items-center gap-1 p-3">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className="cs-focus inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] transition"
                  style={{
                    background: active ? "var(--paper-3)" : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-2)",
                    border: `1px solid ${active ? "var(--rule-2)" : "transparent"}`,
                    boxShadow: active
                      ? "0 0 0 1px var(--rule-2) inset, 0 8px 24px -14px var(--glow)"
                      : undefined,
                  }}
                  aria-pressed={active}
                >
                  <span>{f.label}</span>
                  <span
                    className="font-mono text-[10.5px]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {loading ? (
              <div
                className="py-12 text-center"
                style={{ color: "var(--ink-3)" }}
              >
                Lade…
              </div>
            ) : (
              <div className="space-y-5">
                {DAYS_IN_ORDER.map((day) => {
                  const slots = byDay[day];
                  return (
                    <section key={day}>
                      <div
                        className="caps mb-2 px-1 text-[10.5px]"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {day}
                      </div>
                      {slots.length === 0 ? (
                        <div
                          className="rounded-md border border-dashed px-3 py-3 text-[12px]"
                          style={{
                            borderColor: "var(--rule)",
                            color: "var(--ink-4)",
                          }}
                        >
                          Keine Einträge.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {slots.map((s) => (
                            <SlotRow
                              key={s.id}
                              slot={s}
                              onEdit={() =>
                                setDialog({ mode: "edit", slot: s })
                              }
                              onChangeStatus={(next) => changeStatus(s, next)}
                              onHardDelete={() => hardDelete(s)}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {dialog && (
        <SlotDialog
          initial={dialog.mode === "edit" ? dialog.slot : null}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            setDialog(null);
            setAll((prev) => {
              const idx = prev.findIndex((s) => s.id === saved.id);
              if (idx === -1) return [...prev, saved];
              const next = prev.slice();
              next[idx] = saved;
              return next;
            });
          }}
        />
      )}
    </div>
  );
}

function SlotDialog(props: {
  initial: TrainingSlot | null;
  onClose: () => void;
  onSaved: (slot: TrainingSlot) => void;
}) {
  const { initial, onClose, onSaved } = props;
  const [group, setGroup] = useState(initial?.group ?? "");
  const [day, setDay] = useState<TrainingDay>(initial?.day ?? "Montag");
  const [timeFrom, setTimeFrom] = useState(initial?.timeFrom ?? "17:00");
  const [timeTo, setTimeTo] = useState(initial?.timeTo ?? "18:30");
  const [trainer, setTrainer] = useState(initial?.trainer ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [visibility, setVisibility] = useState<TrainingVisibility>(
    initial?.visibility ?? "offen für Gäste",
  );
  // Editing a legacy archived row: keep its status so saving doesn't silently
  // re-activate it. New rows are always active; the dialog no longer exposes
  // a status picker.
  const [status] = useState<TrainingStatus>(initial?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Lock the page behind the modal from scrolling while it's open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape — matches the click-outside affordance.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (timeFrom >= timeTo) {
      setError("Endzeit muss nach Startzeit liegen.");
      return;
    }
    setSaving(true);
    const payload = {
      group,
      day,
      timeFrom,
      timeTo,
      trainer,
      phone,
      visibility,
      status,
    };
    try {
      const saved = initial
        ? await api.patch<TrainingSlot>(`/api/training/${initial.id}`, payload)
        : await api.post<TrainingSlot>("/api/training", payload);
      onSaved(saved);
    } catch (e2) {
      if (e2 instanceof ApiError) setError(e2.message);
      else setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  // Render to <body> so the modal escapes <main>'s `overflow-y-auto` and the
  // admin-shell wrapper's `position: relative` (the latter sits in an
  // unlayered stylesheet and would otherwise win over Tailwind's `.fixed`
  // utility, which is why an earlier in-place version of this dialog rendered
  // in flow below the table instead of overlaying it).
  return createPortal(
    <div
      className="admin-shell"
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,.7)",
        backdropFilter: "blur(4px)",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="cs-card w-full max-w-lg p-6"
        style={{ maxHeight: "calc(100vh - 2rem)", overflowY: "auto" }}
      >
        <h2
          className="font-display mb-4 text-[24px]"
          style={{ letterSpacing: "-0.01em" }}
        >
          {initial ? "Trainingseintrag bearbeiten" : "Neuer Trainingseintrag"}
        </h2>
        <div className="space-y-3">
          <label className="block">
            <span
              className="caps mb-1 block text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              Gruppe
            </span>
            <input
              required
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="z. B. Bambini (U7)"
              className="cs-input"
            />
          </label>
          <label className="block">
            <span
              className="caps mb-1 block text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              Wochentag
            </span>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as TrainingDay)}
              className="cs-input"
            >
              {DAYS_IN_ORDER.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span
                className="caps mb-1 block text-[11px]"
                style={{ color: "var(--ink-3)" }}
              >
                Beginn
              </span>
              <input
                required
                type="time"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="cs-input"
              />
            </label>
            <label className="block">
              <span
                className="caps mb-1 block text-[11px]"
                style={{ color: "var(--ink-3)" }}
              >
                Ende
              </span>
              <input
                required
                type="time"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
                className="cs-input"
              />
            </label>
          </div>
          <label className="block">
            <span
              className="caps mb-1 block text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              Trainer*in
            </span>
            <input
              required
              value={trainer}
              onChange={(e) => setTrainer(e.target.value)}
              className="cs-input"
            />
          </label>
          <label className="block">
            <span
              className="caps mb-1 block text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              Telefon
            </span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0151 0000 0000"
              className="cs-input"
            />
          </label>
          <fieldset
            className="rounded-md p-3"
            style={{ border: "1px solid var(--rule-2)" }}
          >
            <legend
              className="caps px-2 text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Sichtbarkeit
            </legend>
            {VISIBILITIES.map((v) => (
              <label
                key={v}
                className="mb-1 flex items-center gap-2 text-[13.5px]"
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                />
                {v}
              </label>
            ))}
          </fieldset>
        </div>
        {error && (
          <div
            role="alert"
            className="mt-3 rounded-md px-3 py-2 text-[12px]"
            style={{
              border: "1px solid oklch(0.5 0.15 25 / 0.5)",
              background: "oklch(0.25 0.15 25 / 0.25)",
              color: "oklch(0.85 0.12 25)",
            }}
          >
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button kind="ghost" size="md" onClick={onClose}>
            Abbrechen
          </Button>
          <Button kind="primary" size="md" type="submit" disabled={saving}>
            {saving ? "Speichere…" : "Speichern"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
