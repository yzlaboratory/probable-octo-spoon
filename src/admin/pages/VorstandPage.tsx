import { useEffect, useState } from "react";
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
import logo from "../../assets/logo.svg";

const FILTERS: Array<{ key: string; label: string; status: VorstandStatus | null }> = [
  { key: "active", label: "Aktiv", status: "active" },
  { key: "hidden", label: "Verborgen", status: "hidden" },
  { key: "archived", label: "Ehemalig", status: "archived" },
];

function SortableCard(props: {
  member: Vorstand;
  onEdit: () => void;
  onChangeStatus: (s: VorstandStatus) => void;
  onHardDelete: () => void;
}) {
  const { member, onEdit, onChangeStatus, onHardDelete } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: member.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const portrait =
    member.portrait?.variants["320w"] ||
    member.portrait?.variants["160w"] ||
    member.portrait?.variants["640w"];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex flex-col items-center rounded-sm border border-neutral-800 bg-neutral-950 p-4"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Sortieren"
        className="absolute left-2 top-2 cursor-grab rounded-sm bg-neutral-900 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100"
      >
        ≡
      </button>
      <span
        className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] ${
          member.status === "active"
            ? "bg-emerald-900 text-emerald-200"
            : member.status === "hidden"
              ? "bg-amber-900 text-amber-200"
              : "bg-neutral-800 text-neutral-400"
        }`}
      >
        {member.status === "active" ? "Aktiv" : member.status === "hidden" ? "Verborgen" : "Ehemalig"}
      </span>
      <img
        src={portrait || logo}
        alt=""
        className="mb-3 h-24 w-24 rounded-sm object-cover"
      />
      <div className="text-center font-semibold">{member.name}</div>
      <div className="mb-3 text-center text-xs text-neutral-400">{member.role}</div>
      <div className="flex w-full flex-wrap justify-center gap-1 text-xs">
        <button onClick={onEdit} className="rounded-sm bg-neutral-800 px-2 py-1 hover:bg-neutral-700">
          Bearbeiten
        </button>
        {member.status !== "hidden" && (
          <button onClick={() => onChangeStatus("hidden")} className="rounded-sm bg-neutral-800 px-2 py-1 hover:bg-neutral-700">
            Verbergen
          </button>
        )}
        {member.status !== "active" && (
          <button onClick={() => onChangeStatus("active")} className="rounded-sm bg-neutral-800 px-2 py-1 hover:bg-neutral-700">
            Anzeigen
          </button>
        )}
        {member.status !== "archived" && (
          <button onClick={() => onChangeStatus("archived")} className="rounded-sm bg-neutral-800 px-2 py-1 hover:bg-neutral-700">
            Archivieren
          </button>
        )}
        {member.status === "archived" && (
          <button onClick={onHardDelete} className="rounded-sm bg-red-950 px-2 py-1 text-red-200 hover:bg-red-900">
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}

export default function VorstandPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("active");
  const [all, setAll] = useState<Vorstand[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<null | { mode: "new" } | { mode: "edit"; member: Vorstand }>(null);

  async function load() {
    setLoading(true);
    const data = await api.get<Vorstand[]>("/api/vorstand");
    setAll(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visible = all.filter((m) => m.status === FILTERS.find((f) => f.key === filter)!.status);

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = visible.findIndex((m) => m.id === active.id);
    const newIdx = visible.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(visible, oldIdx, newIdx);
    const rest = all.filter((m) => m.status !== FILTERS.find((f) => f.key === filter)!.status);
    const next = [...reordered, ...rest];
    setAll(next);
    try {
      await api.post("/api/vorstand/reorder", { orderedIds: next.map((m) => m.id) });
    } catch {
      load();
    }
  }

  async function changeStatus(m: Vorstand, status: VorstandStatus) {
    await api.patch(`/api/vorstand/${m.id}`, { status });
    load();
  }

  async function hardDelete(m: Vorstand) {
    const typed = window.prompt(`Zur Bestätigung den Namen eingeben: „${m.name}"`);
    if (typed !== m.name) return;
    await api.delete(`/api/vorstand/${m.id}`);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vorstand</h1>
        <button
          onClick={() => setDialog({ mode: "new" })}
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          + Neues Mitglied
        </button>
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

      {loading ? (
        <div className="text-neutral-500">Lade…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-sm border border-neutral-800 p-8 text-center text-neutral-500">
          Keine Mitglieder in dieser Ansicht.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((m) => m.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((m) => (
                <SortableCard
                  key={m.id}
                  member={m}
                  onEdit={() => setDialog({ mode: "edit", member: m })}
                  onChangeStatus={(s) => changeStatus(m, s)}
                  onHardDelete={() => hardDelete(m)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

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
  const [status, setStatus] = useState<VorstandStatus>(initial?.status ?? "active");
  const [portrait, setPortrait] = useState<Media | null>(initial?.portrait ?? null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-sm border border-neutral-800 bg-neutral-950 p-6"
      >
        <h2 className="mb-4 text-lg font-bold">{initial ? "Mitglied bearbeiten" : "Neues Mitglied"}</h2>
        <div className="space-y-3">
          <MediaUploader kind="vorstand" value={portrait} onChange={setPortrait} label="Portrait" helper="PNG, JPEG oder WebP. Wird automatisch zum Quadrat skaliert." />
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Rolle / Titel</span>
            <input required value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">E-Mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Telefon</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Interne Notizen</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
          </label>
          <fieldset className="rounded-sm border border-neutral-800 p-3">
            <legend className="px-2 text-xs text-neutral-400">Status</legend>
            {(["active", "hidden", "archived"] as const).map((s) => (
              <label key={s} className="mb-1 flex items-center gap-2 text-sm">
                <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} />
                {s === "active" ? "Aktiv" : s === "hidden" ? "Verborgen" : "Ehemalig"}
              </label>
            ))}
          </fieldset>
        </div>
        {error && (
          <div role="alert" className="mt-3 rounded-sm border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-sm border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800">
            Abbrechen
          </button>
          <button type="submit" className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white">
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
}
