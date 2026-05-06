import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { ApiError, getCsrfToken, setCsrfToken } from "./api";
import type { Admin } from "./types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const admin: Admin = { id: 1, email: "eva@example.com" };

interface RecordedState {
  admin: Admin | null;
  loading: boolean;
}

function Probe({
  capture,
}: {
  capture: (s: ReturnType<typeof useAuth>) => void;
}) {
  const auth = useAuth();
  capture(auth);
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="email">{auth.admin?.email ?? ""}</span>
    </div>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setCsrfToken(null);
});

describe("AuthContext", () => {
  it("loads the current admin and CSRF token from /api/auth/me on mount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ admin, csrfToken: "csrf-1" }),
      ),
    );
    let state: RecordedState | undefined;
    const { getByTestId } = render(
      <AuthProvider>
        <Probe
          capture={(s) =>
            (state = { admin: s.admin, loading: s.loading })
          }
        />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(getByTestId("loading").textContent).toBe("false");
    });
    expect(getByTestId("email").textContent).toBe("eva@example.com");
    expect(getCsrfToken()).toBe("csrf-1");
    expect(state?.admin?.id).toBe(1);
  });

  it("treats a 401 from /api/auth/me as logged-out and finishes loading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ code: "auth/required", message: "no" }, 401),
      ),
    );
    setCsrfToken("stale");
    const { getByTestId } = render(
      <AuthProvider>
        <Probe capture={() => {}} />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(getByTestId("loading").textContent).toBe("false");
    });
    expect(getByTestId("email").textContent).toBe("");
    expect(getCsrfToken()).toBeNull();
  });

  it("rethrows non-401 errors from refresh so callers can observe them", async () => {
    // Initial mount: 401 (logged-out) so the auto-refresh resolves cleanly.
    // Then flip to a 500 so the manual refresh() surfaces the ApiError.
    let serverDown = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        serverDown
          ? jsonResponse({ code: "server/down", message: "boom" }, 500)
          : jsonResponse({ code: "auth/required" }, 401),
      ),
    );
    let auth!: ReturnType<typeof useAuth>;
    render(
      <AuthProvider>
        <Probe capture={(s) => (auth = s)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(auth.loading).toBe(false));
    serverDown = true;
    let caught: unknown;
    await act(async () => {
      try {
        await auth.refresh();
      } catch (err) {
        caught = err;
      }
    });
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(500);
  });

  it("login posts credentials, stores the CSRF token, and exposes the new admin", async () => {
    let calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        const u = typeof url === "string" ? url : url.toString();
        calls.push({ url: u, init });
        if (u === "/api/auth/me") {
          // Start logged-out so login() is the only path that flips admin.
          return jsonResponse({ code: "auth/required" }, 401);
        }
        if (u === "/api/auth/login") {
          return jsonResponse({ admin, csrfToken: "csrf-after-login" });
        }
        return jsonResponse({});
      }),
    );
    let auth!: ReturnType<typeof useAuth>;
    render(
      <AuthProvider>
        <Probe capture={(s) => (auth = s)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(auth.loading).toBe(false));
    await act(async () => {
      await auth.login("eva@example.com", "hunter2hunter2");
    });
    expect(auth.admin?.email).toBe("eva@example.com");
    expect(getCsrfToken()).toBe("csrf-after-login");
    const loginCall = calls.find((c) => c.url === "/api/auth/login");
    expect(loginCall?.init?.method).toBe("POST");
    expect(loginCall?.init?.body).toContain("eva@example.com");
  });

  it("logout posts to /api/auth/logout and clears the admin + CSRF state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === "/api/auth/me")
          return jsonResponse({ admin, csrfToken: "csrf-1" });
        if (u === "/api/auth/logout") return jsonResponse({});
        return jsonResponse({});
      }),
    );
    let auth!: ReturnType<typeof useAuth>;
    render(
      <AuthProvider>
        <Probe capture={(s) => (auth = s)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(auth.loading).toBe(false));
    expect(auth.admin?.id).toBe(1);
    await act(async () => {
      await auth.logout();
    });
    expect(auth.admin).toBeNull();
    expect(getCsrfToken()).toBeNull();
  });

  it("clears local state even when the logout request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === "/api/auth/me")
          return jsonResponse({ admin, csrfToken: "csrf-1" });
        if (u === "/api/auth/logout")
          return jsonResponse({ code: "server/down" }, 500);
        return jsonResponse({});
      }),
    );
    let auth!: ReturnType<typeof useAuth>;
    render(
      <AuthProvider>
        <Probe capture={(s) => (auth = s)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(auth.loading).toBe(false));
    let caught: unknown;
    await act(async () => {
      try {
        await auth.logout();
      } catch (err) {
        caught = err;
      }
    });
    expect(caught).toBeInstanceOf(ApiError);
    // The finally block still ran.
    expect(auth.admin).toBeNull();
    expect(getCsrfToken()).toBeNull();
  });

  it("throws a clear error when useAuth is called outside of an AuthProvider", () => {
    function Bare() {
      useAuth();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/within AuthProvider/);
  });
});
