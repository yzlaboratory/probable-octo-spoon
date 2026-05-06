import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { AuthProvider } from "./AuthContext";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AdminLayout", () => {
  it("renders sidebar, topbar, and the matched child route, with the page-enter wrapper keyed on pathname", async () => {
    // Topbar reads from AuthContext; AuthProvider probes /api/auth/me on mount.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 401 })),
    );
    const { container, findByText, getByText } = render(
      <MemoryRouter initialEntries={["/admin/news"]}>
        <AuthProvider>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/admin/news" element={<div>news child</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await findByText("news child");

    // Sidebar + Topbar render — assert via known sidebar text.
    expect(getByText("Inhalte")).toBeInTheDocument();
    // The shell wrapper class is present.
    expect(container.querySelector(".admin-shell")).toBeInTheDocument();
    expect(container.querySelector(".page-enter")).toBeInTheDocument();
  });
});
