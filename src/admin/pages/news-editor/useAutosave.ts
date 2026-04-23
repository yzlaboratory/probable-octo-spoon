import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface Options<T> {
  value: T;
  /** Called after the debounce window. Must throw to signal error. */
  save: (value: T) => Promise<void>;
  /** Debounce window in ms. 800ms matches the prototype. */
  delay?: number;
  /** When false, the hook is inert — useful while the form is still loading. */
  enabled?: boolean;
}

interface Result {
  status: AutosaveStatus;
  /** Absolute ms timestamp of the last successful save, or null. */
  savedAt: number | null;
  /** Last save error message if status === "error". */
  error: string | null;
  /** Fire the save immediately (skipping the debounce window). */
  flush: () => Promise<void>;
}

/**
 * Debounced autosave hook.
 *
 * The current `value` is captured in a ref so the save callback always sees
 * the latest state — even if it was edited again during the in-flight save.
 * When that happens the hook schedules a follow-up save right after the
 * current one resolves.
 */
export function useAutosave<T>({
  value,
  save,
  delay = 800,
  enabled = true,
}: Options<T>): Result {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valueRef = useRef(value);
  const lastSavedRef = useRef<T>(value);
  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef(false);
  const pendingAfterFlightRef = useRef(false);

  // Keep valueRef current so flush() and chained saves see the latest state.
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  async function doSave() {
    const snapshot = valueRef.current;
    if (inflightRef.current) {
      pendingAfterFlightRef.current = true;
      return;
    }
    if (Object.is(snapshot, lastSavedRef.current)) {
      // Nothing changed since last save.
      setStatus("saved");
      return;
    }
    inflightRef.current = true;
    setStatus("saving");
    setError(null);
    try {
      await save(snapshot);
      lastSavedRef.current = snapshot;
      setSavedAt(Date.now());
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      setStatus("error");
    } finally {
      inflightRef.current = false;
      // If edits landed while we were saving, schedule one more pass.
      if (pendingAfterFlightRef.current) {
        pendingAfterFlightRef.current = false;
        void doSave();
      }
    }
  }

  useEffect(() => {
    if (!enabled) return;
    if (Object.is(value, lastSavedRef.current)) return;
    setStatus("pending");
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void doSave();
    }, delay);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, delay]);

  async function flush() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await doSave();
  }

  return { status, savedAt, error, flush };
}
