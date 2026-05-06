import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutosave } from "./useAutosave";

/**
 * Flush pending microtasks. Fake timers advance the event loop but leave
 * resolved promises queued — a handful of awaits clears them.
 */
async function flushMicrotasks() {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }
  });
}

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not save on initial mount — status starts idle", () => {
    const save = vi.fn(async () => {});
    const { result } = renderHook(() =>
      useAutosave({ value: "initial", save, delay: 100 }),
    );
    expect(result.current.status).toBe("idle");
    expect(save).not.toHaveBeenCalled();
  });

  it("debounces rapid edits into a single save", async () => {
    const save = vi.fn(async () => {});
    const { rerender, result } = renderHook(
      ({ v }: { v: string }) =>
        useAutosave({ value: v, save, delay: 100 }),
      { initialProps: { v: "a" } },
    );
    rerender({ v: "ab" });
    rerender({ v: "abc" });
    rerender({ v: "abcd" });
    expect(result.current.status).toBe("pending");
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("abcd");
    await flushMicrotasks();
    expect(result.current.status).toBe("saved");
  });

  it("is inert when enabled=false", async () => {
    const save = vi.fn(async () => {});
    const { rerender } = renderHook(
      ({ v }: { v: string }) =>
        useAutosave({ value: v, save, delay: 50, enabled: false }),
      { initialProps: { v: "a" } },
    );
    rerender({ v: "b" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("captures error messages and exposes them via result.error", async () => {
    const save = vi.fn(async () => {
      throw new Error("boom");
    });
    const { rerender, result } = renderHook(
      ({ v }: { v: string }) =>
        useAutosave({ value: v, save, delay: 10 }),
      { initialProps: { v: "a" } },
    );
    rerender({ v: "b" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await flushMicrotasks();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("boom");
  });

  it("schedules a follow-up save when edits arrive mid-flight", async () => {
    let resolveFirst: (() => void) | null = null;
    const save = vi.fn(
      (v: string) =>
        new Promise<void>((resolve) => {
          if (v === "a") resolveFirst = resolve;
          else resolve();
        }),
    );
    const { rerender } = renderHook(
      ({ v }: { v: string }) =>
        useAutosave({ value: v, save, delay: 10 }),
      { initialProps: { v: "" } },
    );
    rerender({ v: "a" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(save).toHaveBeenCalledTimes(1);
    // Edit arrives while first save is still pending.
    rerender({ v: "ab" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    // Still one in-flight; no new save until first resolves.
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveFirst!();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("ab");
  });

  it("flush() fires immediately, bypassing the debounce timer", async () => {
    const save = vi.fn(async () => {});
    const { rerender, result } = renderHook(
      ({ v }: { v: string }) =>
        useAutosave({ value: v, save, delay: 10_000 }),
      { initialProps: { v: "a" } },
    );
    rerender({ v: "b" });
    await act(async () => {
      await result.current.flush();
    });
    expect(save).toHaveBeenCalledWith("b");
    expect(result.current.status).toBe("saved");
  });

  it("flush() with no pending timer still saves once (covers the timerRef===null branch in flush)", async () => {
    const save = vi.fn(async () => {});
    const { rerender, result } = renderHook(
      ({ v }: { v: string }) =>
        useAutosave({ value: v, save, delay: 50 }),
      { initialProps: { v: "a" } },
    );
    rerender({ v: "b" });
    // Let the debounce timer fire and the save complete first → no pending timer.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    await flushMicrotasks();
    expect(save).toHaveBeenCalledTimes(1);
    save.mockClear();
    // Now flush() with no pending timer and no new edits — should short-circuit
    // through the Object.is(snapshot, lastSaved) branch.
    await act(async () => {
      await result.current.flush();
    });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe("saved");
  });

  it("falls back to a generic message when a non-Error is thrown by save", async () => {
    const save = vi.fn(async () => {
      throw "string-error"; // covers `e instanceof Error ? e.message : "Speichern fehlgeschlagen."`
    });
    const { rerender, result } = renderHook(
      ({ v }: { v: string }) =>
        useAutosave({ value: v, save, delay: 10 }),
      { initialProps: { v: "a" } },
    );
    rerender({ v: "b" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await flushMicrotasks();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Speichern fehlgeschlagen.");
  });

  it("re-edits before the debounce timer fires clear and reschedule (covers timerRef!==null path inside the useEffect)", async () => {
    const save = vi.fn(async () => {});
    const clearSpy = vi.spyOn(window, "clearTimeout");
    const { rerender } = renderHook(
      ({ v }: { v: string }) =>
        useAutosave({ value: v, save, delay: 100 }),
      { initialProps: { v: "a" } },
    );
    rerender({ v: "ab" }); // schedules first timer
    rerender({ v: "abc" }); // should clear the first timer and reschedule
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
