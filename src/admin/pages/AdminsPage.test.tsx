import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminsPage from "./AdminsPage";
import { api, ApiError } from "../api";

interface AdminRow {
  id: number;
  email: string;
  must_change_password: number;
  created_at: string;
}

function admin(over: Partial<AdminRow> & { id: number }): AdminRow {
  return {
    email: `admin${over.id}@svt.de`,
    must_change_password: 0,
    created_at: "2026-04-01T10:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  vi.spyOn(api, "get").mockResolvedValue([] as never);
  vi.spyOn(api, "post").mockResolvedValue({} as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminsPage />
    </MemoryRouter>,
  );
}

describe("AdminsPage", () => {
  it("renders the page header and the empty-state row when no admins exist", async () => {
    const { getByText } = renderPage();
    await waitFor(() =>
      expect(getByText("Keine Administratoren erfasst.")).toBeTruthy(),
    );
    expect(getByText("Administratoren")).toBeTruthy();
  });

  it("loads admins from /api/auth/admins and renders one row per admin", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      admin({ id: 1, email: "alice@svt.de", created_at: "2026-04-22T00:00:00Z" }),
      admin({
        id: 2,
        email: "bob@svt.de",
        must_change_password: 1,
        created_at: "2026-04-15T00:00:00Z",
      }),
    ] as never);
    const { getByText, container } = renderPage();
    await waitFor(() => expect(getByText("alice@svt.de")).toBeTruthy());
    expect(getByText("bob@svt.de")).toBeTruthy();
    // Reset-fällig badge only renders for bob.
    expect(getByText("Passwort-Reset fällig")).toBeTruthy();
    // The two created_at columns render as YYYY-MM-DD.
    expect(container.textContent).toContain("2026-04-22");
    expect(container.textContent).toContain("2026-04-15");
  });

  it("creates an admin, then clears form and reloads", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([] as never);
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const { container } = renderPage();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    const email = container.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    const pw = container.querySelector(
      'input.cs-input.font-mono',
    ) as HTMLInputElement;
    fireEvent.change(email, { target: { value: "new@svt.de" } });
    fireEvent.change(pw, { target: { value: "longenoughpw1" } });
    fireEvent.submit(email.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/auth/admins", {
        email: "new@svt.de",
        password: "longenoughpw1",
        mustChangePassword: true,
      });
    });
    // Form clears + list reloads.
    await waitFor(() => expect(email.value).toBe(""));
    expect(pw.value).toBe("");
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("surfaces a server-side ApiError when create fails", async () => {
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError(400, {
        code: "auth/email-taken",
        message: "E-Mail bereits vergeben",
      }),
    );
    const { container, getByRole } = renderPage();
    const email = container.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    const pw = container.querySelector(
      'input.cs-input.font-mono',
    ) as HTMLInputElement;
    fireEvent.change(email, { target: { value: "dup@svt.de" } });
    fireEvent.change(pw, { target: { value: "x" } });
    fireEvent.submit(email.closest("form") as HTMLFormElement);
    await waitFor(() => {
      expect(getByRole("alert").textContent).toContain(
        "E-Mail bereits vergeben",
      );
    });
  });

  it("falls back to a generic 'Fehler' message for non-ApiError create failures", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new Error("boom"));
    const { container, getByRole } = renderPage();
    const email = container.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    const pw = container.querySelector(
      'input.cs-input.font-mono',
    ) as HTMLInputElement;
    fireEvent.change(email, { target: { value: "x@y.de" } });
    fireEvent.change(pw, { target: { value: "x" } });
    fireEvent.submit(email.closest("form") as HTMLFormElement);
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain("Fehler"),
    );
  });

  it("issues a reset link and renders an absolute URL pointing at /admin/reset", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      admin({ id: 1, email: "alice@svt.de" }),
    ] as never);
    const post = vi
      .spyOn(api, "post")
      .mockResolvedValue({ token: "tok-XYZ" } as never);
    const { container, getByText } = renderPage();
    await waitFor(() => expect(getByText("alice@svt.de")).toBeTruthy());

    fireEvent.click(getByText("Reset-Link ausstellen"));
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/auth/reset-link", {
        email: "alice@svt.de",
      });
    });
    await waitFor(() => {
      expect(container.textContent).toContain(
        "Einmalig verwendbarer Reset-Link",
      );
      expect(container.textContent).toContain(
        `${window.location.origin}/admin/reset?token=tok-XYZ`,
      );
    });
  });

  it("surfaces an ApiError from the reset-link endpoint", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      admin({ id: 1, email: "alice@svt.de" }),
    ] as never);
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError(429, {
        code: "auth/rate-limit",
        message: "Zu viele Versuche",
      }),
    );
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("alice@svt.de")).toBeTruthy());
    fireEvent.click(getByText("Reset-Link ausstellen"));
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain("Zu viele Versuche"),
    );
  });

  it("falls back to 'Fehler' when reset-link rejects with a non-ApiError", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      admin({ id: 1, email: "alice@svt.de" }),
    ] as never);
    vi.spyOn(api, "post").mockRejectedValue(new Error("network down"));
    const { getByText, getByRole } = renderPage();
    await waitFor(() => expect(getByText("alice@svt.de")).toBeTruthy());
    fireEvent.click(getByText("Reset-Link ausstellen"));
    await waitFor(() =>
      expect(getByRole("alert").textContent).toContain("Fehler"),
    );
  });
});
