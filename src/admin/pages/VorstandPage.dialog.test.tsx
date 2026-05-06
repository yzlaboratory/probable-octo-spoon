import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VorstandPage from "./VorstandPage";
import { api } from "../api";

// Covers the dialog field onChange handlers (email/phone/notes/status radio)
// and the AddCard CTA inside the active grid — the existing suite drives the
// header CTA but not the dashed-tile alternative.

beforeEach(() => {
  vi.spyOn(api, "post").mockResolvedValue({} as never);
  vi.spyOn(api, "patch").mockResolvedValue({} as never);
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

describe("VorstandPage — new-member dialog field handlers", () => {
  it("opens the dialog from the AddCard tile (active filter)", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { container, getByText, getAllByText } = renderPage();
    await waitFor(() =>
      expect(getByText("Mitglied hinzufügen")).toBeTruthy(),
    );
    fireEvent.click(getByText("Mitglied hinzufügen"));
    // Header CTA + dialog title both read "Neues Mitglied" — assert exactly
    // two so we know the dialog actually opened.
    expect(getAllByText("Neues Mitglied").length).toBe(2);
    expect(container.querySelector(".admin-shell.fixed")).toBeTruthy();
    expect(getByText("Speichern")).toBeTruthy();
  });

  it("captures email, phone, notes, and the status-radio change before submit", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const { container, getByText } = renderPage();
    await waitFor(() =>
      expect(getByText("Mitglied hinzufügen")).toBeTruthy(),
    );
    fireEvent.click(getByText("Neues Mitglied"));

    const inputs = container.querySelectorAll<HTMLInputElement>(
      "form input.cs-input",
    );
    // 0=name, 1=role, 2=email, 3=phone.
    fireEvent.change(inputs[0], { target: { value: "Eva Schmidt" } });
    fireEvent.change(inputs[1], { target: { value: "Vorsitzende" } });
    fireEvent.change(inputs[2], { target: { value: "eva@example.org" } });
    fireEvent.change(inputs[3], { target: { value: "0123 456 789" } });

    const notes = container.querySelector(
      "form textarea.cs-input",
    ) as HTMLTextAreaElement;
    fireEvent.change(notes, { target: { value: "Bemerkung" } });

    const radios = container.querySelectorAll<HTMLInputElement>(
      "form input[type='radio'][name='status']",
    );
    // Click the "hidden" radio (index 1) to flip the dialog status.
    fireEvent.click(radios[1]);

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/vorstand", {
        name: "Eva Schmidt",
        role: "Vorsitzende",
        email: "eva@example.org",
        phone: "0123 456 789",
        portraitMediaId: null,
        notes: "Bemerkung",
        status: "hidden",
      });
    });
  });
});
