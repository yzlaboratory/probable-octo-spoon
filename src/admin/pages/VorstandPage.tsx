import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, ApiError } from "../api";
import type { Media, Vorstand, VorstandStatus } from "../types";
import MediaUploader from "../components/MediaUploader";
import { Button, Card, PageHeader, Pill } from "../ui";
import type { PillTone } from "../ui/Pill";
import * as Icons from "../ui/Icons";

interface FilterSpec {
  key: VorstandStatus;
  label: string;
}

const FILTERS: FilterSpec[] = [
  { key: "active", label: "Aktiv" },
  { key: "hidden", label: "Verborgen" },
  { key: "archived", label: "Ehemalig" },
];

const STATUS_TONES: Record<VorstandStatus, PillTone> = {
  active: "primary",
  hidden: "warn",
  archived: "mute",
};

const STATUS_LABELS: Record<VorstandStatus, string> = {
  active: "Aktiv",
  hidden: "Verborgen",
  archived: "Ehemalig",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function nameHue(name: string): number {
  // Stable hue per name so the gradient tile stays consistent across reloads.
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  }
  return h % 360;
}

function SortableCard(props: {
  member: Vorstand;
  onEdit: () => void;
  onChangeStatus: (s: VorstandStatus) => void;
  onHardDelete: () => void;
}) {
  const { member, onEdit, onChangeStatus, onHardDelete } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: member.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const portrait =
    member.portrait?.variants["320w"] ||
    member.portrait?.variants["160w"] ||
    member.portrait?.variants["640w"];
  const hue = nameHue(member.name);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cs-card flex flex-col overflow-hidden group"
    >
      <div
        className="relative"
        style={{
          aspectRatio: "4 / 5",
          background: `linear-gradient(135deg, oklch(0.55 0.16 ${hue}), var(--paper-3))`,
        }}
      >
        <div className="absolute inset-0 stripes" />
        {portrait ? (
          <img
            src={portrait}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center font-display text-[26px]"
              style={{
                background: `oklch(0.62 0.2 ${hue})`,
                color: "#fff",
                boxShadow: "0 0 24px oklch(0.62 0.2 " + hue + " / 0.5)",
              }}
            >
              {initials(member.name)}
            </div>
          </div>
        )}
        {/* Drag handle (top-left, hover-revealed) */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Ziehen zum Umsortieren"
          className="absolute top-2 left-2 p-1 rounded cs-focus opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing"
          style={{
            background: "color-mix(in oklab, var(--paper) 70%, transparent)",
            backdropFilter: "blur(4px)",
            color: "var(--ink-2)",
          }}
        >
          <Icons.Drag size={14} />
        </button>
        {/* Status pill (top-right) */}
        <div className="absolute top-2 right-2">
          <Pill tone={STATUS_TONES[member.status]}>
            {STATUS_LABELS[member.status]}
          </Pill>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div
          className="caps text-[10px]"
          style={{ color: "var(--ink-3)" }}
        >
          {member.role}
        </div>
        <div
          className="font-display text-[19px] leading-tight"
          style={{ color: "var(--ink)", textWrap: "balance" }}
        >
          {member.name}
        </div>
        <div className="flex-1" />
        <div
          className="font-mono text-[11px] truncate"
          style={{ color: member.email ? "var(--ink-2)" : "var(--ink-4)" }}
        >
          {member.email || "— E-Mail fehlt"}
        </div>
        <div
          className="text-[11px]"
          style={{ color: member.phone ? "var(--ink-2)" : "var(--ink-4)" }}
        >
          {member.phone || "— Telefon fehlt"}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <Button kind="ghost" size="sm" onClick={onEdit}>
            Bearbeiten
          </Button>
          {member.status !== "hidden" && (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => onChangeStatus("hidden")}
            >
              Verbergen
            </Button>
          )}
          {member.status !== "active" && (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => onChangeStatus("active")}
            >
              Anzeigen
            </Button>
          )}
          {member.status !== "archived" && (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => onChangeStatus("archived")}
            >
              Archivieren
            </Button>
          )}
          {member.status === "archived" && (
            <Button kind="danger" size="sm" onClick={onHardDelete}>
              Löschen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-[10px] cs-focus transition hover:bg-[var(--paper-3)]"
      style={{
        border: "1px dashed var(--rule-2)",
        color: "var(--ink-3)",
        minHeight: 320,
      }}
    >
      <Icons.Plus size={24} />
      <div
        className="font-display text-[17px]"
        style={{ color: "var(--ink-2)" }}
      >
        Mitglied hinzufügen
      </div>
      <div className="text-[11.5px] px-6 text-center">
        Neue Person im Vorstand erfassen.
      </div>
    </button>
  );
}

export default function VorstandPage() {
  const [filter, setFilter] = useState<VorstandStatus>("active");
  const [all, setAll] = useState<Vorstand[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<
    null | { mode: "new" } | { mode: "edit"; member: Vorstand }
  >(null);

  async function load() {
    setLoading(true);
    const data = await api.get<Vorstand[]>("/api/vorstand");
    setAll(data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const counts = useMemo(
    () => ({
      active: all.filter((m) => m.status === "active").length,
      hidden: all.filter((m) => m.status === "hidden").length,
      archived: all.filter((m) => m.status === "archived").length,
    }),
    [all],
  );

  const visible = all.filter((m) => m.status === filter);

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = visible.findIndex((m) => m.id === active.id);
    const newIdx = visible.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(visible, oldIdx, newIdx);
    const rest = all.filter((m) => m.status !== filter);
    const next = [...reordered, ...rest];
    setAll(next);
    try {
      await api.post("/api/vorstand/reorder", {
        orderedIds: next.map((m) => m.id),
      });
    } catch {
      load();
    }
  }

  async function changeStatus(m: Vorstand, status: VorstandStatus) {
    await api.patch(`/api/vorstand/${m.id}`, { status });
    load();
  }

  async function hardDelete(m: Vorstand) {
    const typed = window.prompt(
      `Zur Bestätigung den Namen eingeben: „${m.name}"`,
    );
    if (typed !== m.name) return;
    await api.delete(`/api/vorstand/${m.id}`);
    load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Organisation"
        title="Vorstand"
        subtitle="Positionen, Reihenfolge und Kontaktdaten des Vereinsvorstands."
        right={
          <Button
            kind="primary"
            size="md"
            leading={<Icons.Plus size={14} />}
            onClick={() => setDialog({ mode: "new" })}
          >
            Neues Mitglied
          </Button>
        }
      />

      <div className="px-10 pb-10">
        <Card padded={false}>
          <div className="flex items-center gap-1 p-3 rule-b flex-wrap">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className="cs-focus inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] transition"
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={visible.map((m) => m.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {visible.map((m) => (
                      <SortableCard
                        key={m.id}
                        member={m}
                        onEdit={() => setDialog({ mode: "edit", member: m })}
                        onChangeStatus={(s) => changeStatus(m, s)}
                        onHardDelete={() => hardDelete(m)}
                      />
                    ))}
                    {filter === "active" && (
                      <AddCard onClick={() => setDialog({ mode: "new" })} />
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </Card>
      </div>

      {dialog && (
        <VorstandDialog
          initial={dialog.mode === "edit" ? dialog.member : null}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function VorstandDialog(props: {
  initial: Vorstand | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { initial, onClose, onSaved } = props;
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [status, setStatus] = useState<VorstandStatus>(
    initial?.status ?? "active",
  );
  const [portrait, setPortrait] = useState<Media | null>(
    initial?.portrait ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      role,
      email: email || null,
      phone: phone || null,
      portraitMediaId: portrait?.id ?? null,
      notes: notes || null,
      status,
    };
    try {
      if (initial) await api.patch(`/api/vorstand/${initial.id}`, payload);
      else await api.post("/api/vorstand", payload);
      onSaved();
    } catch (e2) {
      if (e2 instanceof ApiError) setError(e2.message);
      else setError("Speichern fehlgeschlagen.");
    }
  }

  return (
    <div
      className="admin-shell fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="cs-card w-full max-w-lg p-6 max-h-[90vh] overflow-auto"
      >
        <h2
          className="font-display text-[24px] mb-4"
          style={{ letterSpacing: "-0.01em" }}
        >
          {initial ? "Mitglied bearbeiten" : "Neues Mitglied"}
        </h2>
        <div className="space-y-3">
          <MediaUploader
            kind="vorstand"
            value={portrait}
            onChange={setPortrait}
            label="Portrait"
            helper="PNG, JPEG oder WebP. Wird automatisch zum Quadrat skaliert."
          />
          <label className="block">
            <span
              className="mb-1 block text-[11px] caps"
              style={{ color: "var(--ink-3)" }}
            >
              Name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="cs-input"
            />
          </label>
          <label className="block">
            <span
              className="mb-1 block text-[11px] caps"
              style={{ color: "var(--ink-3)" }}
            >
              Rolle / Titel
            </span>
            <input
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="cs-input"
            />
          </label>
          <label className="block">
            <span
              className="mb-1 block text-[11px] caps"
              style={{ color: "var(--ink-3)" }}
            >
              E-Mail
            </span>
            <input
              type="email"
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
              Telefon
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="cs-input"
            />
          </label>
          <label className="block">
            <span
              className="mb-1 block text-[11px] caps"
              style={{ color: "var(--ink-3)" }}
            >
              Interne Notizen
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="cs-input"
            />
          </label>
          <fieldset
            className="rounded-md p-3"
            style={{ border: "1px solid var(--rule-2)" }}
          >
            <legend
              className="px-2 text-[10.5px] caps"
              style={{ color: "var(--ink-3)" }}
            >
              Status
            </legend>
            {(["active", "hidden", "archived"] as const).map((s) => (
              <label
                key={s}
                className="mb-1 flex items-center gap-2 text-[13.5px]"
              >
                <input
                  type="radio"
                  name="status"
                  checked={status === s}
                  onChange={() => setStatus(s)}
                />
                {STATUS_LABELS[s]}
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
          <Button kind="primary" size="md" type="submit">
            Speichern
          </Button>
        </div>
      </form>
    </div>
  );
}
