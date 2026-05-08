import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TrainingPage from "./TrainingPage";
import { api, ApiError } from "../api";
import type { TrainingBanner, TrainingSlot } from "../types";

function slot(over: Partial<TrainingSlot> & { id: number }): TrainingSlot {
  return {
    group: `Gruppe ${over.id}`,
    day: "Montag",
    timeFrom: "17:00",
    timeTo: "18:30",
    trainer: "Trainer/in",
    phone: "0151 0000",
    visibility: "offen für Gäste",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...over,
  };
}

function bannerNull(): TrainingBanner {
  return { message: null, updatedAt: null };
}

beforeEach(() => {
  vi.spyOn(api, "post").mockResolvedValue({} as never);
  vi.spyOn(api, "patch").mockResolvedValue({} as never);
  vi.spyOn(api, "delete").mockResolvedValue(undefined as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

function mockGet(slots: TrainingSlot[], banner: TrainingBanner = bannerNull()) {
  return vi.spyOn(api, "get").mockImplementation(async (path: string) => {
    if (path === "/api/training") return slots as never;
    if (path === "/api/training/banner") return banner as never;
    return [] as never;
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TrainingPage />
    </MemoryRouter>,
  );
}

describe("TrainingPage", () => {
  it("renders the page header and loads slots + banner in parallel", async () => {
    const get = mockGet([]);
    const { getByText } = renderPage();
    expect(getByText("Training")).toBeTruthy();
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/api/training"),
    );
    expect(get).toHaveBeenCalledWith("/api/training/banner");
  });

  it("renders all seven weekday headings, with empty placeholders when no slots", async () => {
    mockGet([]);
    const { getByText, getAllByText } = renderPage();
    await waitFor(() => expect(getByText("Montag")).toBeTruthy());
    for (const day of [
      "Montag",
      "Dienstag",
      "Mittwoch",
      "Donnerstag",
      "Freitag",
      "Samstag",
      "Sonntag",
    ]) {
      expect(getByText(day)).toBeTruthy();
    }
    expect(getAllByText("Keine Einträge.").length).toBe(7);
  });

  it("groups slots by day and sorts them by start time", async () => {
    mockGet([
      slot({ id: 1, group: "Late Mon", day: "Montag", timeFrom: "19:00" }),
      slot({ id: 2, group: "Early Mon", day: "Montag", timeFrom: "16:00" }),
      slot({ id: 3, group: "Mid Mon", day: "Montag", timeFrom: "17:30" }),
    ]);
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.textContent).toContain("Early Mon"),
    );
    const order = ["Early Mon", "Mid Mon", "Late Mon"];
    const text = container.textContent ?? "";
    const indices = order.map((g) => text.indexOf(g));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("filters by 'Verborgen' to show only hidden slots", async () => {
    mockGet([
      slot({ id: 1, group: "Visible Mon", status: "active" }),
      slot({ id: 2, group: "Hidden Mon", status: "hidden" }),
    ]);
    const { container, getByText, queryByText } = renderPage();
    await waitFor(() => expect(getByText("Visible Mon")).toBeTruthy());
    expect(queryByText("Hidden Mon")).toBeNull();
    fireEvent.click(getByText("Verborgen"));
    await waitFor(() => expect(getByText("Hidden Mon")).toBeTruthy());
    expect(container.textContent).not.toContain("Visible Mon");
  });

  it("changes a slot's status via the per-row 'Verbergen' button", async () => {
    mockGet([
      slot({ id: 9, group: "Soon Hidden", status: "active" }),
    ]);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue(slot({ id: 9, status: "hidden" }) as never);
    const { getByText } = renderPage();
    await waitFor(() => expect(getByText("Soon Hidden")).toBeTruthy());
    fireEvent.click(getByText("Verbergen"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/training/9", {
        status: "hidden",
      }),
    );
  });

  it("hard-deletes a slot only when the typed group name matches", async () => {
    mockGet([slot({ id: 4, group: "Old Group" })]);
    const del = vi
      .spyOn(api, "delete")
      .mockResolvedValue(undefined as never);
    const promptSpy = vi.spyOn(window, "prompt");

    const { getByText } = renderPage();
    await waitFor(() => expect(getByText("Old Group")).toBeTruthy());

    promptSpy.mockReturnValueOnce("nope");
    fireEvent.click(getByText("Löschen"));
    expect(del).not.toHaveBeenCalled();

    promptSpy.mockReturnValueOnce("Old Group");
    fireEvent.click(getByText("Löschen"));
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("/api/training/4"),
    );
  });

  it("opens the new-slot dialog from the page header CTA", async () => {
    mockGet([]);
    const { getByText, getAllByText } = renderPage();
    await waitFor(() => expect(getByText("Montag")).toBeTruthy());
    fireEvent.click(getByText("Neuer Trainingseintrag"));
    // 'Neuer Trainingseintrag' is now both the header button and the dialog title.
    expect(getAllByText("Neuer Trainingseintrag").length).toBe(2);
  });

  it("rejects a dialog submission where end-time is not after start-time", async () => {
    mockGet([]);
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Montag")).toBeTruthy());
    fireEvent.click(getByText("Neuer Trainingseintrag"));
    const dialog = getByRole("dialog");
    const form = dialog.querySelector("form") as HTMLFormElement;
    const inputs = form.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "Test" } });
    fireEvent.change(inputs[1], { target: { value: "20:00" } });
    fireEvent.change(inputs[2], { target: { value: "18:00" } });
    fireEvent.change(inputs[3], { target: { value: "T" } });
    fireEvent.change(inputs[4], { target: { value: "0" } });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain(
        "Endzeit muss nach Startzeit",
      ),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("creates a slot via POST with all dialog fields", async () => {
    mockGet([]);
    const post = vi
      .spyOn(api, "post")
      .mockResolvedValue(slot({ id: 100, group: "Bambini" }) as never);
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Montag")).toBeTruthy());
    fireEvent.click(getByText("Neuer Trainingseintrag"));
    const dialog = getByRole("dialog");
    const form = dialog.querySelector("form") as HTMLFormElement;
    const inputs = form.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "Bambini (U7)" } });
    fireEvent.change(form.querySelector("select")!, {
      target: { value: "Mittwoch" },
    });
    fireEvent.change(inputs[1], { target: { value: "16:30" } });
    fireEvent.change(inputs[2], { target: { value: "17:30" } });
    fireEvent.change(inputs[3], { target: { value: "Coach Eva" } });
    fireEvent.change(inputs[4], { target: { value: "0151 1234" } });
    fireEvent.submit(form);
    await waitFor(() => expect(post).toHaveBeenCalled());
    const [path, payload] = post.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(path).toBe("/api/training");
    expect(payload).toMatchObject({
      group: "Bambini (U7)",
      day: "Mittwoch",
      timeFrom: "16:30",
      timeTo: "17:30",
      trainer: "Coach Eva",
      phone: "0151 1234",
      visibility: "offen für Gäste",
      status: "active",
    });
  });

  it("opens the edit dialog for an existing slot, prefills + PATCHes", async () => {
    mockGet([
      slot({
        id: 7,
        group: "Senioren",
        day: "Donnerstag",
        timeFrom: "19:30",
        timeTo: "21:00",
        trainer: "Klaus",
        phone: "0151 9999",
        visibility: "Anmeldung erforderlich",
      }),
    ]);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue(slot({ id: 7 }) as never);
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Senioren")).toBeTruthy());
    fireEvent.click(getByText("Bearbeiten"));
    expect(getByText("Trainingseintrag bearbeiten")).toBeTruthy();
    const dialog = getByRole("dialog");
    const form = dialog.querySelector("form") as HTMLFormElement;
    const inputs = form.querySelectorAll("input");
    expect((inputs[0] as HTMLInputElement).value).toBe("Senioren");
    expect((inputs[3] as HTMLInputElement).value).toBe("Klaus");
    fireEvent.change(inputs[3], { target: { value: "Klaus K." } });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        "/api/training/7",
        expect.objectContaining({
          group: "Senioren",
          trainer: "Klaus K.",
          visibility: "Anmeldung erforderlich",
          status: "active",
        }),
      ),
    );
  });

  it("surfaces an ApiError message on dialog save failure", async () => {
    mockGet([]);
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError(409, {
        code: "training/conflict",
        message: "Konflikt mit bestehender Gruppe",
      }),
    );
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Montag")).toBeTruthy());
    fireEvent.click(getByText("Neuer Trainingseintrag"));
    const dialog = getByRole("dialog");
    const form = dialog.querySelector("form") as HTMLFormElement;
    const inputs = form.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "Test" } });
    fireEvent.change(inputs[3], { target: { value: "T" } });
    fireEvent.change(inputs[4], { target: { value: "0" } });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain(
        "Konflikt mit bestehender Gruppe",
      ),
    );
  });

  it("falls back to a generic message for non-ApiError dialog failures", async () => {
    mockGet([]);
    vi.spyOn(api, "post").mockRejectedValue(new Error("boom"));
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Montag")).toBeTruthy());
    fireEvent.click(getByText("Neuer Trainingseintrag"));
    const dialog = getByRole("dialog");
    const form = dialog.querySelector("form") as HTMLFormElement;
    const inputs = form.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "Test" } });
    fireEvent.change(inputs[3], { target: { value: "T" } });
    fireEvent.change(inputs[4], { target: { value: "0" } });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain(
        "Speichern fehlgeschlagen",
      ),
    );
  });

  it("closes the dialog on Escape and on backdrop click", async () => {
    mockGet([]);
    const { getByText, queryByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Montag")).toBeTruthy());
    fireEvent.click(getByText("Neuer Trainingseintrag"));
    expect(getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(queryByText("Neuer Trainingseintrag")).toBeTruthy(),
    );
    // The header button still says 'Neuer Trainingseintrag' but the dialog is gone.
    expect(document.querySelector("[role='dialog']")).toBeNull();
    // Reopen + close via backdrop click.
    fireEvent.click(getByText("Neuer Trainingseintrag"));
    fireEvent.click(getByRole("dialog"));
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("locks body scroll while the dialog is open and restores it on close", async () => {
    mockGet([]);
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Montag")).toBeTruthy());
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(getByText("Neuer Trainingseintrag"));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(getByRole("dialog"));
    await waitFor(() =>
      expect(document.body.style.overflow).toBe(""),
    );
  });
});

describe("TrainingPage > BannerEditor", () => {
  it("loads the existing banner message into the textarea and shows the 'sichtbar' pill", async () => {
    mockGet([], { message: "Sommerpause", updatedAt: "2026-04-01T00:00Z" });
    const { container } = renderPage();
    await waitFor(() => {
      const ta = container.querySelector("textarea") as HTMLTextAreaElement | null;
      return expect(ta?.value).toBe("Sommerpause");
    });
    // The 'sichtbar' pill text lives next to its dot span, but findByText
    // descends into children — wait until the populated banner state renders.
    await waitFor(() =>
      expect(container.textContent).toContain("sichtbar"),
    );
  });

  it("shows the 'aus' pill when the banner is empty", async () => {
    mockGet([]);
    const { container } = renderPage();
    await waitFor(() => expect(container.textContent).toContain("aus"));
  });

  it("PATCHes the banner with the typed message and reflects the response", async () => {
    mockGet([]);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({
      message: "Hello!",
      updatedAt: "2026-05-01T00:00Z",
    } as never);
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelector("textarea")).toBeTruthy(),
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "Hello!" } });
    // The BannerEditor 'Speichern' is the only save button enabled on the page
    // until the user opens a dialog or interacts with a slot.
    const bannerCard = ta.closest(".cs-card") as HTMLElement;
    const saveBtn = Array.from(
      bannerCard.querySelectorAll("button"),
    ).find((b) => b.textContent === "Speichern") as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();
    expect(saveBtn.disabled).toBe(false);
    fireEvent.click(saveBtn);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/training/banner", {
        message: "Hello!",
      }),
    );
    await waitFor(() =>
      expect(container.textContent).toContain("sichtbar"),
    );
  });

  it("hides the banner when the 'Banner ausblenden' button is clicked", async () => {
    mockGet([], { message: "alt", updatedAt: null });
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue({ message: null, updatedAt: null } as never);
    const { getByText } = renderPage();
    await waitFor(() => expect(getByText("sichtbar")).toBeTruthy());
    fireEvent.click(getByText("Banner ausblenden"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/training/banner", {
        message: null,
      }),
    );
    await waitFor(() => expect(getByText("aus")).toBeTruthy());
  });

  it("surfaces an ApiError from the banner endpoint via role=alert", async () => {
    mockGet([], { message: "x", updatedAt: null });
    vi.spyOn(api, "patch").mockRejectedValue(
      new ApiError(400, {
        code: "training/banner-too-long",
        message: "Banner zu lang",
      }),
    );
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Banner ausblenden")).toBeTruthy());
    fireEvent.click(getByText("Banner ausblenden"));
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain("Banner zu lang"),
    );
  });

  it("falls back to 'Speichern fehlgeschlagen.' when the banner endpoint throws a non-Error", async () => {
    mockGet([], { message: "x", updatedAt: null });
    vi.spyOn(api, "patch").mockImplementation(async () => {
      throw "string";
    });
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Banner ausblenden")).toBeTruthy());
    fireEvent.click(getByText("Banner ausblenden"));
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain("Speichern fehlgeschlagen."),
    );
  });
});

describe("TrainingPage — slot row actions", () => {
  it("shows 'Anzeigen' on a hidden slot and re-activates it via PATCH", async () => {
    mockGet([slot({ id: 1, status: "hidden" })]);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue(slot({ id: 1, status: "active" }) as never);
    const { getByText } = renderPage();
    // Filter defaults to "active" — switch to the "hidden" tab so the slot is visible.
    await waitFor(() => expect(getByText("Verborgen")).toBeTruthy());
    fireEvent.click(getByText("Verborgen"));
    await waitFor(() => expect(getByText("Anzeigen")).toBeTruthy());
    fireEvent.click(getByText("Anzeigen"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/training/1", {
        status: "active",
      }),
    );
  });
});

describe("TrainingPage — edit dialog interactions", () => {
  it("flips visibility via the radio group and persists it on save", async () => {
    mockGet([slot({ id: 1 })]);
    const patch = vi.spyOn(api, "patch").mockResolvedValue(
      slot({ id: 1 }) as never,
    );
    const { getByText, queryByText } = renderPage();
    await waitFor(() => expect(getByText("Bearbeiten")).toBeTruthy());
    fireEvent.click(getByText("Bearbeiten"));
    await waitFor(() =>
      expect(queryByText("Trainingseintrag bearbeiten")).toBeTruthy(),
    );
    // Visibility radios live in the dialog (rendered via createPortal); query body-wide.
    const radios = document.querySelectorAll(
      "input[type='radio'][name='visibility']",
    );
    expect(radios.length).toBeGreaterThan(1);
    fireEvent.click(radios[radios.length - 1]);
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => expect(patch).toHaveBeenCalled());
  });

  it("closes on Escape AND ignores other keys (covers the keydown listener)", async () => {
    mockGet([slot({ id: 1 })]);
    const { getByText, queryByText } = renderPage();
    await waitFor(() => expect(getByText("Bearbeiten")).toBeTruthy());
    fireEvent.click(getByText("Bearbeiten"));
    expect(queryByText("Trainingseintrag bearbeiten")).toBeTruthy();
    // Non-Escape key — should NOT close.
    fireEvent.keyDown(window, { key: "a" });
    expect(queryByText("Trainingseintrag bearbeiten")).toBeTruthy();
    // Escape — closes.
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(queryByText("Trainingseintrag bearbeiten")).toBeFalsy(),
    );
  });

  it("closes when the backdrop is clicked but stays open when a child of the form is clicked", async () => {
    mockGet([slot({ id: 1 })]);
    const { getByText, queryByText } = renderPage();
    await waitFor(() => expect(getByText("Bearbeiten")).toBeTruthy());
    fireEvent.click(getByText("Bearbeiten"));
    expect(queryByText("Trainingseintrag bearbeiten")).toBeTruthy();
    // Click on the form (child) — modal stays open.
    fireEvent.click(document.querySelector("form")!);
    expect(queryByText("Trainingseintrag bearbeiten")).toBeTruthy();
    // Click on the backdrop (target === currentTarget) — modal closes.
    fireEvent.click(document.querySelector("[role='dialog']")!);
    await waitFor(() =>
      expect(queryByText("Trainingseintrag bearbeiten")).toBeFalsy(),
    );
  });
});
