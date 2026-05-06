import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import TrainingSection from "./TrainingSection";
import type { TrainingSlot } from "../data/training";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const slot = (over: Partial<TrainingSlot> = {}): TrainingSlot => ({
  id: 1,
  group: "Herren",
  day: "Montag",
  timeFrom: "18:30",
  timeTo: "20:00",
  trainer: "Max Beispiel",
  phone: "0123 456789",
  visibility: "offen für Gäste",
  ...over,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TrainingSection", () => {
  it("shows seven empty day columns when the API returns no slots", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ slots: [], banner: { message: null } })),
    );
    const { container } = render(<TrainingSection />);
    await waitFor(() => {
      expect(container.querySelectorAll(".trainingday").length).toBe(7);
    });
    // Default heading is rendered.
    expect(container.textContent).toContain("TRAINING");
    // Banner is hidden when message is null.
    expect(container.querySelector(".trainingbanner")).toBeNull();
  });

  it("hides its own heading when hideHeading is true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ slots: [], banner: { message: null } })),
    );
    const { container } = render(<TrainingSection hideHeading />);
    await waitFor(() => {
      expect(container.querySelectorAll(".trainingday").length).toBe(7);
    });
    expect(container.textContent).not.toContain("TRAINING");
  });

  it("renders each slot under its day, sorted by start time, with each visibility chip", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          slots: [
            slot({ id: 1, day: "Montag", timeFrom: "20:00", group: "Spät" }),
            slot({ id: 2, day: "Montag", timeFrom: "18:00", group: "Früh" }),
            slot({
              id: 3,
              day: "Mittwoch",
              visibility: "Anmeldung erforderlich",
              group: "Kids",
            }),
            slot({
              id: 4,
              day: "Freitag",
              visibility: "nur Mitglieder",
              group: "Senioren",
            }),
          ],
          banner: { message: null },
        }),
      ),
    );
    const { container } = render(<TrainingSection />);
    await waitFor(() =>
      expect(container.querySelectorAll(".trainingslot").length).toBe(4),
    );
    const monday = container.querySelector(
      "[data-day='Montag']",
    ) as HTMLElement;
    const titles = Array.from(
      monday.querySelectorAll<HTMLHeadingElement>("h3"),
    ).map((h) => h.textContent);
    expect(titles).toEqual(["Früh", "Spät"]);
    // All three visibility chips are exercised.
    expect(container.textContent).toContain("offen für Gäste");
    expect(container.textContent).toContain("Anmeldung erforderlich");
    expect(container.textContent).toContain("nur Mitglieder");
    // Phone number rendered as a tel: link with whitespace stripped.
    const tel = container.querySelector(
      "a[href='tel:0123456789']",
    ) as HTMLAnchorElement;
    expect(tel).not.toBeNull();
  });

  it("renders the seasonal banner when a message is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          slots: [],
          banner: { message: "Halle wegen Sommerpause geschlossen" },
        }),
      ),
    );
    const { container } = render(<TrainingSection />);
    await waitFor(() =>
      expect(container.querySelector(".trainingbanner")).not.toBeNull(),
    );
    expect(container.textContent).toContain("Sommerpause");
  });

  it("silently keeps the empty state when /api/training/public returns a non-OK status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const { container } = render(<TrainingSection />);
    await waitFor(() => {
      expect(container.querySelectorAll(".trainingday").length).toBe(7);
    });
    expect(container.querySelectorAll(".trainingslot").length).toBe(0);
  });

  it("ignores stale resolutions after unmount (cancelled flag prevents setState)", async () => {
    let resolve!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((r) => {
            resolve = r;
          }),
      ),
    );
    const { unmount, container } = render(<TrainingSection />);
    unmount();
    // No throw / no state-update warning.
    resolve(
      jsonResponse({ slots: [slot()], banner: { message: "x" } }),
    );
    await new Promise((r) => setTimeout(r, 10));
    // Nothing left in the document.
    expect(container.querySelectorAll(".trainingslot").length).toBe(0);
  });

  it("falls back to a null banner when the API omits the banner field", async () => {
    vi.stubGlobal(
      "fetch",
      // No `banner` key — the component must default it.
      vi.fn(async () => jsonResponse({ slots: [] })),
    );
    const { container } = render(<TrainingSection />);
    await waitFor(() =>
      expect(container.querySelectorAll(".trainingday").length).toBe(7),
    );
    expect(container.querySelector(".trainingbanner")).toBeNull();
  });
});
