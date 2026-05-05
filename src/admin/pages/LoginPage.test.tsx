import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./LoginPage";
import { ApiError } from "../api";

const { loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn<(email: string, password: string) => Promise<void>>(),
}));
vi.mock("../AuthContext", () => ({
  useAuth: () => ({
    admin: null,
    loading: false,
    login: loginMock,
    logout: vi.fn(),
    refresh: vi.fn(),
  }),
}));

function renderAt(initial: { pathname: string; state?: unknown } | string) {
  return render(
    <MemoryRouter initialEntries={[initial as never]}>
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/news" element={<div>NEWS LIST</div>} />
        <Route path="/admin/sponsors" element={<div>SPONSOR LIST</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  loginMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("renders the login form with email + password inputs", () => {
    const { getByText, container } = renderAt("/admin/login");
    expect(getByText("Admin-Bereich")).toBeTruthy();
    expect(container.querySelector('input[type="email"]')).toBeTruthy();
    expect(container.querySelector('input[type="password"]')).toBeTruthy();
    const submit = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.textContent).toContain("Anmelden");
  });

  it("trims and lowercases the email before calling login", async () => {
    loginMock.mockResolvedValue(undefined);
    const { container, getByText } = renderAt("/admin/login");
    const email = container.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    const pw = container.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    fireEvent.change(email, { target: { value: "  Eva@Example.COM  " } });
    fireEvent.change(pw, { target: { value: "hunter2hunter2" } });
    fireEvent.submit(email.closest("form") as HTMLFormElement);
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(
        "eva@example.com",
        "hunter2hunter2",
      );
    });
    // After successful login, the navigate target ("/admin/news" by default) renders.
    await waitFor(() => expect(getByText("NEWS LIST")).toBeTruthy());
  });

  it("redirects to the original location passed in router state on success", async () => {
    loginMock.mockResolvedValue(undefined);
    const { container, getByText } = renderAt({
      pathname: "/admin/login",
      state: { from: "/admin/sponsors" },
    });
    const email = container.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    const pw = container.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    fireEvent.change(email, { target: { value: "a@b.de" } });
    fireEvent.change(pw, { target: { value: "x" } });
    fireEvent.submit(email.closest("form") as HTMLFormElement);
    await waitFor(() => expect(getByText("SPONSOR LIST")).toBeTruthy());
  });

  it("surfaces an ApiError message via role=alert", async () => {
    loginMock.mockRejectedValue(
      new ApiError(401, { code: "auth/invalid", message: "Falsche Daten" }),
    );
    const { container, getByRole } = renderAt("/admin/login");
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.change(
      container.querySelector('input[type="email"]') as HTMLInputElement,
      { target: { value: "a@b.de" } },
    );
    fireEvent.change(
      container.querySelector('input[type="password"]') as HTMLInputElement,
      { target: { value: "x" } },
    );
    fireEvent.submit(form);
    await waitFor(() => {
      const alert = getByRole("alert");
      expect(alert.textContent).toContain("Falsche Daten");
    });
  });

  it("falls back to a generic error message for non-ApiError failures", async () => {
    loginMock.mockRejectedValue(new Error("boom"));
    const { container, getByRole } = renderAt("/admin/login");
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.change(
      container.querySelector('input[type="email"]') as HTMLInputElement,
      { target: { value: "a@b.de" } },
    );
    fireEvent.change(
      container.querySelector('input[type="password"]') as HTMLInputElement,
      { target: { value: "x" } },
    );
    fireEvent.submit(form);
    await waitFor(() => {
      expect(getByRole("alert").textContent).toContain(
        "Anmeldung fehlgeschlagen",
      );
    });
  });

  it("disables the submit button and shows a submitting label while in flight", async () => {
    let resolve!: () => void;
    loginMock.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    const { container } = renderAt("/admin/login");
    const submit = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    fireEvent.change(
      container.querySelector('input[type="email"]') as HTMLInputElement,
      { target: { value: "a@b.de" } },
    );
    fireEvent.change(
      container.querySelector('input[type="password"]') as HTMLInputElement,
      { target: { value: "x" } },
    );
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(submit.disabled).toBe(true));
    expect(submit.textContent).toContain("Anmelden…");
    resolve();
    await waitFor(() => expect(submit.disabled).toBe(false));
  });
});
