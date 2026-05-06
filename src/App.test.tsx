import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("App", () => {
  it("renders the public Layout + HomePage at /", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([])),
    );
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Partner & Förderer");
    });
  });

  it("renders the Impressum page at /Impressum", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([])),
    );
    const { container } = render(
      <MemoryRouter initialEntries={["/Impressum"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("IMPRESSUM");
    });
  });

  it("redirects to login when an unauthenticated user requests an admin route", async () => {
    // RequireAuth probes /api/auth/me; resolve as 401 so it bounces to /admin/login.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.toString().includes("/api/auth/me")) {
          return new Response("", { status: 401 });
        }
        return jsonResponse([]);
      }),
    );
    const { container } = render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => {
      // LoginPage shows a heading and the email/password form.
      expect(container.querySelector("input[type='email']")).toBeInTheDocument();
    });
  });
});
