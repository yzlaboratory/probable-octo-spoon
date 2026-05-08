import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SponsorEditPage from "./SponsorEditPage";
import { api, ApiError } from "../api";
import type { Sponsor } from "../types";

function s(over: Partial<Sponsor> & { id: number }): Sponsor {
  return {
    name: `Sponsor ${over.id}`,
    tagline: null,
    linkUrl: "https://example.com",
    logoHasOwnBackground: false,
    cardPalette: "transparent",
    weight: 50,
    status: "active",
    activeFrom: null,
    activeUntil: null,
    notes: null,
    displayOrder: 0,
    logo: {
      id: 11,
      mimeType: "image/png",
      variants: { "200w": "/m/200/x.png" },
    } as never,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...over,
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/sponsors/new" element={<SponsorEditPage />} />
        <Route path="/admin/sponsors/:id" element={<SponsorEditPage />} />
        <Route path="/admin/sponsors" element={<div>SPONSOR LIST</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(api, "post").mockResolvedValue({} as never);
  vi.spyOn(api, "patch").mockResolvedValue({} as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SponsorEditPage", () => {
  it("renders the new-sponsor form without fetching the sponsor list", () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { getByText, container } = renderAt("/admin/sponsors/new");
    expect(getByText("Neuer Sponsor")).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
    // No "Lade…" placeholder.
    expect(container.textContent).not.toContain("Lade…");
  });

  it("loads the existing sponsor and prefills every editable field", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({
        id: 7,
        name: "Bäckerei Müller",
        tagline: "frisch seit 1903",
        linkUrl: "https://baeckerei.example",
        weight: 80,
        status: "paused",
        activeFrom: "2026-04-10T08:30:00Z",
        activeUntil: "2026-08-10T08:30:00Z",
        notes: "Sticht im Q2 raus",
        cardPalette: "warm-neutral",
        logoHasOwnBackground: true,
      }),
    ] as never);
    const { container, getByText } = renderAt("/admin/sponsors/7");
    await waitFor(() => expect(getByText("Bäckerei Müller")).toBeTruthy());
    const inputs = container.querySelectorAll("input.cs-input");
    expect((inputs[0] as HTMLInputElement).value).toBe("Bäckerei Müller");
    expect((inputs[1] as HTMLInputElement).value).toBe("frisch seit 1903");
    expect((inputs[2] as HTMLInputElement).value).toBe(
      "https://baeckerei.example",
    );
    const weight = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    expect(weight.value).toBe("80");
    const checkbox = container.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    // datetime-local inputs are sliced to YYYY-MM-DDTHH:MM (16 chars).
    const dts = container.querySelectorAll('input[type="datetime-local"]');
    expect((dts[0] as HTMLInputElement).value).toBe("2026-04-10T08:30");
    expect((dts[1] as HTMLInputElement).value).toBe("2026-08-10T08:30");
    // Status radios — the 'Pausiert' radio is checked.
    const radios = container.querySelectorAll(
      'input[type="radio"][name="status"]',
    );
    const checked = Array.from(radios).find(
      (r) => (r as HTMLInputElement).checked,
    ) as HTMLInputElement;
    expect(checked.parentElement?.textContent).toContain("Pausiert");
    // Notes textarea.
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("Sticht im Q2 raus");
  });

  it("shows a 'nicht gefunden' error if the id is unknown", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 1 })] as never);
    const { getByRole } = renderAt("/admin/sponsors/999");
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain(
        "Sponsor nicht gefunden",
      ),
    );
  });

  it("blocks submit and surfaces 'Logo hochladen' when no logo is attached", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const { container, getByRole } = renderAt("/admin/sponsors/new");
    const inputs = container.querySelectorAll("input.cs-input");
    fireEvent.change(inputs[0], { target: { value: "Acme" } });
    fireEvent.change(inputs[2], {
      target: { value: "https://acme.example" },
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain(
        "Bitte ein Logo hochladen",
      ),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("PATCHes when editing and navigates back to the list on success", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 3, name: "Old" })] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue({} as never);
    const { container, getByText } = renderAt("/admin/sponsors/3");
    await waitFor(() => {
      const inputs = container.querySelectorAll("input.cs-input");
      return expect((inputs[0] as HTMLInputElement).value).toBe("Old");
    });
    const inputs = container.querySelectorAll("input.cs-input");
    fireEvent.change(inputs[0], { target: { value: "New" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        "/api/sponsors/3",
        expect.objectContaining({ name: "New", logoMediaId: 11 }),
      ),
    );
    await waitFor(() => expect(getByText("SPONSOR LIST")).toBeTruthy());
  });

  it("converts datetime-local inputs to ISO strings in the payload", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 3 })] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue({} as never);
    const { container } = renderAt("/admin/sponsors/3");
    await waitFor(() => {
      const inputs = container.querySelectorAll("input.cs-input");
      return expect(inputs.length).toBeGreaterThan(0);
    });
    const dts = container.querySelectorAll('input[type="datetime-local"]');
    fireEvent.change(dts[0], { target: { value: "2026-06-01T10:00" } });
    fireEvent.change(dts[1], { target: { value: "2026-09-01T10:00" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(patch).toHaveBeenCalled());
    const [, payload] = patch.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.activeFrom).toBe(
      new Date("2026-06-01T10:00").toISOString(),
    );
    expect(payload.activeUntil).toBe(
      new Date("2026-09-01T10:00").toISOString(),
    );
  });

  it("sends null for empty optional fields (tagline, notes, datetimes)", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    // For new mode, MediaUploader starts empty so we'd hit the guard. Force a
    // logo by going through edit mode with a sponsor whose tagline + notes are
    // already empty, just clearing them.
    vi.spyOn(api, "get").mockResolvedValue([
      s({ id: 9, tagline: "x", notes: "y" }),
    ] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue({} as never);
    const { container } = renderAt("/admin/sponsors/9");
    await waitFor(() => {
      const inputs = container.querySelectorAll("input.cs-input");
      return expect((inputs[1] as HTMLInputElement).value).toBe("x");
    });
    const inputs = container.querySelectorAll("input.cs-input");
    fireEvent.change(inputs[1], { target: { value: "" } }); // tagline
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(patch).toHaveBeenCalled());
    const [, payload] = patch.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.tagline).toBeNull();
    expect(payload.notes).toBeNull();
    expect(payload.activeFrom).toBeNull();
    expect(payload.activeUntil).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it("surfaces an ApiError message when save fails", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 3 })] as never);
    vi.spyOn(api, "patch").mockRejectedValue(
      new ApiError(409, {
        code: "sponsor/conflict",
        message: "Konflikt entdeckt",
      }),
    );
    const { container, getByRole } = renderAt("/admin/sponsors/3");
    await waitFor(() => {
      const inputs = container.querySelectorAll("input.cs-input");
      return expect(inputs.length).toBeGreaterThan(0);
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain("Konflikt entdeckt"),
    );
  });

  it("falls back to a generic message for non-ApiError save failures", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 3 })] as never);
    vi.spyOn(api, "patch").mockRejectedValue(new Error("boom"));
    const { container, getByRole } = renderAt("/admin/sponsors/3");
    await waitFor(() => {
      const inputs = container.querySelectorAll("input.cs-input");
      return expect(inputs.length).toBeGreaterThan(0);
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain(
        "Speichern fehlgeschlagen",
      ),
    );
  });

  it("changes the card palette when a swatch button is clicked", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 1 })] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue({} as never);
    const { getByText, container } = renderAt("/admin/sponsors/1");
    await waitFor(() => {
      const inputs = container.querySelectorAll("input.cs-input");
      return expect(inputs.length).toBeGreaterThan(0);
    });
    fireEvent.click(getByText("Clubviolett"));
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(patch).toHaveBeenCalled());
    const [, payload] = patch.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.cardPalette).toBe("purple");
  });

  it("toggles status via the radio group", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 1 })] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue({} as never);
    const { container } = renderAt("/admin/sponsors/1");
    await waitFor(() => {
      const inputs = container.querySelectorAll("input.cs-input");
      return expect(inputs.length).toBeGreaterThan(0);
    });
    const radios = container.querySelectorAll(
      'input[type="radio"][name="status"]',
    );
    // 0=active, 1=paused, 2=archived
    fireEvent.click(radios[2]);
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(patch).toHaveBeenCalled());
    const [, payload] = patch.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.status).toBe("archived");
  });

  it("returns to the list when the header 'Abbrechen' is clicked", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 1 })] as never);
    const { getByText } = renderAt("/admin/sponsors/1");
    await waitFor(() => expect(getByText("Abbrechen")).toBeTruthy());
    fireEvent.click(getByText("Abbrechen"));
    await waitFor(() => expect(getByText("SPONSOR LIST")).toBeTruthy());
  });

  it("renders the 'Kühl' (cool-neutral) palette swatch and persists it on save", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 1 })] as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);
    const { getByText, container } = renderAt("/admin/sponsors/1");
    await waitFor(() => {
      expect(container.querySelectorAll("input.cs-input").length).toBeGreaterThan(0);
    });
    fireEvent.click(getByText("Kühl"));
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(patch).toHaveBeenCalled());
    const [, payload] = patch.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.cardPalette).toBe("cool-neutral");
  });

  it("falls back to 'Speichern fehlgeschlagen.' when a non-ApiError is thrown by the save call", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 1 })] as never);
    vi.spyOn(api, "patch").mockRejectedValue(new Error("network down"));
    const { container, findByText } = renderAt("/admin/sponsors/1");
    await waitFor(() => {
      expect(container.querySelectorAll("input.cs-input").length).toBeGreaterThan(0);
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await findByText("Speichern fehlgeschlagen.");
  });

  it("toggles 'Logo hat einen eigenen Hintergrund' and persists it on save", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({ id: 1, logoHasOwnBackground: false }),
    ] as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);
    const { container } = renderAt("/admin/sponsors/1");
    await waitFor(() => {
      expect(container.querySelectorAll("input.cs-input").length).toBeGreaterThan(0);
    });
    const checkbox = container.querySelector(
      "input[type='checkbox']",
    ) as HTMLInputElement;
    fireEvent.click(checkbox);
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(patch).toHaveBeenCalled());
    const [, payload] = patch.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.logoHasOwnBackground).toBe(true);
  });

  it("guards against saving without a logo — surfaces 'Bitte ein Logo hochladen.' on the create form", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const { container, findByText } = renderAt("/admin/sponsors/new");
    await findByText("Neuer Sponsor");
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await findByText("Bitte ein Logo hochladen.");
    expect(post).not.toHaveBeenCalled();
  });

  it("updates the weight input and persists it on save", async () => {
    vi.spyOn(api, "get").mockResolvedValue([s({ id: 1, weight: 1 })] as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);
    const { container } = renderAt("/admin/sponsors/1");
    await waitFor(() => {
      expect(container.querySelectorAll("input.cs-input").length).toBeGreaterThan(0);
    });
    const weightInput = container.querySelector(
      "input[type='number']",
    ) as HTMLInputElement;
    fireEvent.change(weightInput, { target: { value: "42" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(patch).toHaveBeenCalled());
    const [, payload] = patch.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.weight).toBe(42);
  });
});
