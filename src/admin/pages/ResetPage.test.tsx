import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResetPage from "./ResetPage";
import { api, ApiError } from "../api";

function renderAt(query: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/reset${query}`]}>
      <Routes>
        <Route path="/admin/reset" element={<ResetPage />} />
        <Route path="/admin/login" element={<div>LOGIN PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ResetPage", () => {
  it("renders both password inputs and the submit button", () => {
    const { container, getByText } = renderAt("?token=abc");
    expect(getByText("Passwort zurücksetzen")).toBeTruthy();
    const pws = container.querySelectorAll('input[type="password"]');
    expect(pws.length).toBe(2);
    expect(
      (
        container.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement | null
      )?.textContent,
    ).toContain("Passwort speichern");
  });

  it("rejects mismatched confirmation client-side without calling the API", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue(undefined as never);
    const { container, getByRole } = renderAt("?token=abc");
    const [pw, confirm] = Array.from(
      container.querySelectorAll(
        'input[type="password"]',
      ) as NodeListOf<HTMLInputElement>,
    );
    fireEvent.change(pw, { target: { value: "supersecret123" } });
    fireEvent.change(confirm, { target: { value: "DIFFERENT" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => {
      expect(getByRole("alert").textContent).toContain(
        "stimmen nicht überein",
      );
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("calls the reset endpoint with the token + new password and redirects after success", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue(undefined as never);
    const { container, getByText } = renderAt("?token=tk-1");
    const [pw, confirm] = Array.from(
      container.querySelectorAll(
        'input[type="password"]',
      ) as NodeListOf<HTMLInputElement>,
    );
    fireEvent.change(pw, { target: { value: "supersecret123" } });
    fireEvent.change(confirm, { target: { value: "supersecret123" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/auth/reset-consume", {
        token: "tk-1",
        newPassword: "supersecret123",
      });
    });
    // Success banner is shown immediately.
    await waitFor(() =>
      expect(container.textContent?.includes("Passwort gesetzt")).toBe(true),
    );
    // After ~1.5s the page navigates to /admin/login. Allow real-time so the
    // setTimeout fires; bump the waitFor timeout to a safe margin.
    await waitFor(() => expect(getByText("LOGIN PAGE")).toBeTruthy(), {
      timeout: 3000,
    });
  });

  it("treats a missing token in the URL as the empty string", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue(undefined as never);
    const { container } = renderAt("");
    const [pw, confirm] = Array.from(
      container.querySelectorAll(
        'input[type="password"]',
      ) as NodeListOf<HTMLInputElement>,
    );
    fireEvent.change(pw, { target: { value: "x" } });
    fireEvent.change(confirm, { target: { value: "x" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/auth/reset-consume", {
        token: "",
        newPassword: "x",
      }),
    );
  });

  it("surfaces an ApiError message via role=alert and stays on the form", async () => {
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError(400, {
        code: "auth/reset-invalid",
        message: "Token abgelaufen",
      }),
    );
    const { container, getByRole } = renderAt("?token=expired");
    const [pw, confirm] = Array.from(
      container.querySelectorAll(
        'input[type="password"]',
      ) as NodeListOf<HTMLInputElement>,
    );
    fireEvent.change(pw, { target: { value: "x" } });
    fireEvent.change(confirm, { target: { value: "x" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => {
      expect(getByRole("alert").textContent).toContain("Token abgelaufen");
    });
    // Still on the form (success banner has not replaced it).
    expect(container.querySelectorAll('input[type="password"]').length).toBe(2);
  });

  it("falls back to a generic message for unexpected error shapes", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new Error("network down"));
    const { container, getByRole } = renderAt("?token=t");
    const [pw, confirm] = Array.from(
      container.querySelectorAll(
        'input[type="password"]',
      ) as NodeListOf<HTMLInputElement>,
    );
    fireEvent.change(pw, { target: { value: "x" } });
    fireEvent.change(confirm, { target: { value: "x" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => {
      expect(getByRole("alert").textContent).toContain(
        "Reset fehlgeschlagen",
      );
    });
  });
});
