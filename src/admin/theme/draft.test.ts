import { describe, expect, it, beforeEach } from "vitest";
import {
  BASE_SIZE_RANGE,
  DEFAULT_DRAFT,
  STORAGE_KEY,
  clampBaseSize,
  coerceDraft,
  loadDraft,
  resetDraft,
  saveDraft,
} from "./draft";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}

class ThrowingStorage implements Storage {
  length = 0;
  clear() {
    throw new Error("denied");
  }
  getItem(): string | null {
    throw new Error("denied");
  }
  key(): string | null {
    throw new Error("denied");
  }
  removeItem() {
    throw new Error("denied");
  }
  setItem() {
    throw new Error("denied");
  }
}

describe("coerceDraft", () => {
  it("returns defaults for null / undefined / non-object input", () => {
    expect(coerceDraft(null)).toEqual(DEFAULT_DRAFT);
    expect(coerceDraft(undefined)).toEqual(DEFAULT_DRAFT);
    expect(coerceDraft(42)).toEqual(DEFAULT_DRAFT);
    expect(coerceDraft("not-json-shape")).toEqual(DEFAULT_DRAFT);
  });

  it("preserves a fully-valid draft round-trip", () => {
    const valid = {
      palette: "moss",
      headingFont: "Fraunces",
      bodyFont: "Manrope",
      baseSizePx: 18,
      density: "compact",
      darkNav: false,
      instagramOnHome: false,
      updatedAt: "2026-05-02T12:00:00.000Z",
    };
    expect(coerceDraft(valid)).toEqual(valid);
  });

  it("falls back per-field for individually-bad entries", () => {
    const broken = {
      palette: "neon", // invalid
      headingFont: "Newsreader",
      bodyFont: "Comic", // invalid
      baseSizePx: 99, // out of range
      density: "balanced",
      darkNav: "yes", // wrong type
      instagramOnHome: true,
      updatedAt: 12345, // wrong type
    };
    const out = coerceDraft(broken);
    expect(out.palette).toBe(DEFAULT_DRAFT.palette);
    expect(out.headingFont).toBe("Newsreader");
    expect(out.bodyFont).toBe(DEFAULT_DRAFT.bodyFont);
    expect(out.baseSizePx).toBe(DEFAULT_DRAFT.baseSizePx);
    expect(out.density).toBe("balanced");
    expect(out.darkNav).toBe(DEFAULT_DRAFT.darkNav);
    expect(out.instagramOnHome).toBe(true);
    expect(out.updatedAt).toBe(DEFAULT_DRAFT.updatedAt);
  });

  it("rounds non-integer baseSizePx within range to an integer", () => {
    expect(coerceDraft({ baseSizePx: 17.4 }).baseSizePx).toBe(17);
    expect(coerceDraft({ baseSizePx: 17.7 }).baseSizePx).toBe(18);
  });

  it("rejects baseSizePx below minimum and above maximum", () => {
    expect(coerceDraft({ baseSizePx: 13 }).baseSizePx).toBe(
      DEFAULT_DRAFT.baseSizePx,
    );
    expect(coerceDraft({ baseSizePx: 21 }).baseSizePx).toBe(
      DEFAULT_DRAFT.baseSizePx,
    );
    expect(coerceDraft({ baseSizePx: NaN }).baseSizePx).toBe(
      DEFAULT_DRAFT.baseSizePx,
    );
  });

  it("accepts the boundary values 14 and 20", () => {
    expect(coerceDraft({ baseSizePx: BASE_SIZE_RANGE.min }).baseSizePx).toBe(14);
    expect(coerceDraft({ baseSizePx: BASE_SIZE_RANGE.max }).baseSizePx).toBe(20);
  });
});

describe("loadDraft", () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("returns defaults when nothing stored", () => {
    expect(loadDraft(storage)).toEqual(DEFAULT_DRAFT);
  });

  it("returns the stored draft when valid", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_DRAFT, palette: "navy" }),
    );
    expect(loadDraft(storage).palette).toBe("navy");
  });

  it("returns defaults when stored JSON is corrupted", () => {
    storage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadDraft(storage)).toEqual(DEFAULT_DRAFT);
  });

  it("does not throw when storage access throws", () => {
    expect(() => loadDraft(new ThrowingStorage())).not.toThrow();
    expect(loadDraft(new ThrowingStorage())).toEqual(DEFAULT_DRAFT);
  });
});

describe("saveDraft", () => {
  it("persists the draft and stamps updatedAt to now", () => {
    const storage = new MemoryStorage();
    const fixed = new Date("2026-05-02T08:30:00.000Z");
    const stamped = saveDraft(
      { ...DEFAULT_DRAFT, palette: "kiosk" },
      storage,
      () => fixed,
    );
    expect(stamped.updatedAt).toBe(fixed.toISOString());
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(parsed.palette).toBe("kiosk");
    expect(parsed.updatedAt).toBe(fixed.toISOString());
  });

  it("overwrites a prior draft on the same key", () => {
    const storage = new MemoryStorage();
    saveDraft({ ...DEFAULT_DRAFT, palette: "navy" }, storage);
    saveDraft({ ...DEFAULT_DRAFT, palette: "moss" }, storage);
    expect(loadDraft(storage).palette).toBe("moss");
  });

  it("does not throw if storage is unavailable", () => {
    expect(() =>
      saveDraft({ ...DEFAULT_DRAFT, palette: "moss" }, new ThrowingStorage()),
    ).not.toThrow();
  });
});

describe("resetDraft", () => {
  it("removes the storage key and returns defaults", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ palette: "navy" }));
    expect(resetDraft(storage)).toEqual(DEFAULT_DRAFT);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("is idempotent when no draft is stored", () => {
    const storage = new MemoryStorage();
    expect(resetDraft(storage)).toEqual(DEFAULT_DRAFT);
    expect(resetDraft(storage)).toEqual(DEFAULT_DRAFT);
  });

  it("does not throw when storage access throws", () => {
    expect(() => resetDraft(new ThrowingStorage())).not.toThrow();
  });
});

describe("clampBaseSize", () => {
  it("clamps below-min and above-max to the range", () => {
    expect(clampBaseSize(10)).toBe(BASE_SIZE_RANGE.min);
    expect(clampBaseSize(99)).toBe(BASE_SIZE_RANGE.max);
  });
  it("rounds and passes-through values inside the range", () => {
    expect(clampBaseSize(15.4)).toBe(15);
    expect(clampBaseSize(15.7)).toBe(16);
    expect(clampBaseSize(20)).toBe(20);
  });
  it("falls back to default on NaN/Infinity", () => {
    expect(clampBaseSize(NaN)).toBe(DEFAULT_DRAFT.baseSizePx);
    expect(clampBaseSize(Infinity)).toBe(DEFAULT_DRAFT.baseSizePx);
  });
});
