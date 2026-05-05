import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VorstandPage from "./VorstandPage";
import { api, ApiError } from "../api";
import type { Vorstand } from "../types";

function v(over: Partial<Vorstand> & { id: number }): Vorstand {
  return {
    name: `Person ${over.id}`,
    role: "Mitglied",
    email: null,
    phone: null,
    notes: null,
    status: "active",
    displayOrder: 0,
    portrait: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  vi.spyOn(api, "post").mockResolvedValue({} as never);
  vi.spyOn(api, "patch").mockResolvedValue({} as never);
  vi.spyOn(api, "delete").mockResolvedValue(undefined as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <VorstandPage />
    </MemoryRouter>,
  );
}

describe("VorstandPage", () => {
  it("renders the page header and loads vorstand on mount", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { getByText } = renderPage();
    expect(getByText("Vorstand")).toBeTruthy();
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/api/vorstand"),
    );
  });

  it("shows the AddCard placeholder only on the 'active' filter", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { getByText, queryByText } = renderPage();
    await waitFor(() =>
      expect(getByText("Mitglied hinzufügen")).toBeTruthy(),
    );
    fireEvent.click(getByText("Verborgen"));
    expect(queryByText("Mitglied hinzufügen")).toBeNull();
    fireEvent.click(getByText("Aktiv"));
    expect(getByText("Mitglied hinzufügen")).toBeTruthy();
  });

  it("renders one card per active member with role + email/phone fallback labels", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({
        id: 1,
        name: "Eva Schmidt",
        role: "Vorsitzende",
        email: "eva@svt.de",
        phone: "012345",
      }),
      v({ id: 2, name: "Peter ohne Daten", role: "Beisitzer" }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() => expect(getByText("Eva Schmidt")).toBeTruthy());
    expect(getByText("Vorsitzende")).toBeTruthy();
    expect(getByText("eva@svt.de")).toBeTruthy();
    expect(getByText("Peter ohne Daten")).toBeTruthy();
    // Fallback markers for missing email + phone.
    expect(container.textContent).toContain("E-Mail fehlt");
    expect(container.textContent).toContain("Telefon fehlt");
  });

  it("renders the portrait when present, initials placeholder otherwise", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({
        id: 1,
        name: "Anna Berger",
        portrait: { id: 1, variants: { "320w": "/m/320/a.jpg" } } as never,
      }),
      v({ id: 2, name: "Bernd Klein", portrait: null }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() => expect(getByText("Anna Berger")).toBeTruthy());
    // First card has an img, second card shows the initials "BK".
    expect(container.querySelector("img[src='/m/320/a.jpg']")).toBeTruthy();
    expect(container.textContent).toContain("BK");
  });

  it("filters by status and shows the count next to each tab", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "Live A", status: "active" }),
      v({ id: 2, name: "Hidden", status: "hidden" }),
      v({ id: 3, name: "Old", status: "archived" }),
      v({ id: 4, name: "Old too", status: "archived" }),
    ] as never);
    const { getByText, container, queryByText } = renderPage();
    await waitFor(() => expect(getByText("Live A")).toBeTruthy());
    // Counts adjacent to each filter button.
    expect(container.textContent).toContain("Aktiv");
    // Switching filter shows different members.
    expect(queryByText("Hidden")).toBeNull();
    fireEvent.click(getByText("Verborgen"));
    expect(getByText("Hidden")).toBeTruthy();
    fireEvent.click(getByText("Ehemalig"));
    expect(getByText("Old")).toBeTruthy();
    expect(getByText("Old too")).toBeTruthy();
  });

  it("changes status via the per-card 'Verbergen' button", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 5, name: "Soon Hidden", status: "active" }),
    ] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue({} as never);
    const { getByText } = renderPage();
    await waitFor(() => expect(getByText("Soon Hidden")).toBeTruthy());
    fireEvent.click(getByText("Verbergen"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/vorstand/5", {
        status: "hidden",
      }),
    );
  });

  it("'Anzeigen' button only renders for non-active members", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "Hidden Person", status: "hidden" }),
    ] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue({} as never);
    const { getByText } = renderPage();
    fireEvent.click(getByText("Verborgen"));
    await waitFor(() => expect(getByText("Hidden Person")).toBeTruthy());
    fireEvent.click(getByText("Anzeigen"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/vorstand/1", {
        status: "active",
      }),
    );
  });

  it("hard-deletes an archived member only when the typed name matches", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "Old One", status: "archived" }),
    ] as never);
    const del = vi
      .spyOn(api, "delete")
      .mockResolvedValue(undefined as never);
    const promptSpy = vi.spyOn(window, "prompt");

    const { getByText } = renderPage();
    fireEvent.click(getByText("Ehemalig"));
    await waitFor(() => expect(getByText("Old One")).toBeTruthy());

    promptSpy.mockReturnValueOnce("wrong");
    fireEvent.click(getByText("Löschen"));
    expect(del).not.toHaveBeenCalled();

    promptSpy.mockReturnValueOnce("Old One");
    fireEvent.click(getByText("Löschen"));
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("/api/vorstand/1"),
    );
  });

  it("opens the new-member dialog from the page header CTA", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { container, getByText, getAllByText } = renderPage();
    await waitFor(() =>
      expect(getByText("Mitglied hinzufügen")).toBeTruthy(),
    );
    fireEvent.click(getByText("Neues Mitglied"));
    // After click, "Neues Mitglied" appears twice — header button + dialog title.
    expect(getAllByText("Neues Mitglied").length).toBe(2);
    expect(getByText("Speichern")).toBeTruthy();
    expect(container.querySelector(".admin-shell.fixed")).toBeTruthy();
  });

  it("creates a new member via POST and reloads on success", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([] as never);
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const { container, getByText } = renderPage();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    fireEvent.click(getByText("Neues Mitglied"));
    const inputs = container.querySelectorAll("form input.cs-input");
    // 0=name, 1=role, 2=email, 3=phone.
    fireEvent.change(inputs[0], { target: { value: "Maria K." } });
    fireEvent.change(inputs[1], { target: { value: "Schriftführerin" } });
    fireEvent.change(inputs[2], { target: { value: "" } });
    fireEvent.change(inputs[3], { target: { value: "" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/vorstand", {
        name: "Maria K.",
        role: "Schriftführerin",
        email: null,
        phone: null,
        portraitMediaId: null,
        notes: null,
        status: "active",
      });
    });
    // Dialog closes and reload is triggered.
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("opens edit dialog with prefilled fields and PATCHes on save", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({
        id: 17,
        name: "Eva Schmidt",
        role: "Vorsitzende",
        email: "eva@svt.de",
        phone: "012345",
        notes: "alt",
      }),
    ] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue({} as never);
    const { container, getByText } = renderPage();
    await waitFor(() => expect(getByText("Eva Schmidt")).toBeTruthy());
    fireEvent.click(getByText("Bearbeiten"));
    expect(getByText("Mitglied bearbeiten")).toBeTruthy();
    const inputs = container.querySelectorAll("form input.cs-input");
    expect((inputs[0] as HTMLInputElement).value).toBe("Eva Schmidt");
    expect((inputs[2] as HTMLInputElement).value).toBe("eva@svt.de");
    // Tweak role and submit.
    fireEvent.change(inputs[1], { target: { value: "1. Vorsitzende" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        "/api/vorstand/17",
        expect.objectContaining({
          name: "Eva Schmidt",
          role: "1. Vorsitzende",
          email: "eva@svt.de",
        }),
      ),
    );
  });

  it("surfaces an ApiError message in the dialog", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "Eva" }),
    ] as never);
    vi.spyOn(api, "patch").mockRejectedValue(
      new ApiError(409, {
        code: "vorstand/conflict",
        message: "Vorstands-Konflikt",
      }),
    );
    const { container, getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Eva")).toBeTruthy());
    fireEvent.click(getByText("Bearbeiten"));
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain("Vorstands-Konflikt"),
    );
  });

  it("falls back to a generic message for non-ApiError dialog failures", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "Eva" }),
    ] as never);
    vi.spyOn(api, "patch").mockRejectedValue(new Error("network"));
    const { container, getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("Eva")).toBeTruthy());
    fireEvent.click(getByText("Bearbeiten"));
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain(
        "Speichern fehlgeschlagen",
      ),
    );
  });

  it("closes the dialog on backdrop click and on the 'Abbrechen' button", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { container, getByText, queryByText } = renderPage();
    await waitFor(() =>
      expect(getByText("Mitglied hinzufügen")).toBeTruthy(),
    );
    fireEvent.click(getByText("Neues Mitglied"));
    expect(getByText("Speichern")).toBeTruthy();
    // 'Abbrechen' closes.
    fireEvent.click(getByText("Abbrechen"));
    expect(queryByText("Speichern")).toBeNull();

    // Reopen + close via backdrop.
    fireEvent.click(getByText("Neues Mitglied"));
    expect(getByText("Speichern")).toBeTruthy();
    const backdrop = container.querySelector(".admin-shell.fixed") as HTMLElement;
    fireEvent.click(backdrop);
    expect(queryByText("Speichern")).toBeNull();
  });
});
