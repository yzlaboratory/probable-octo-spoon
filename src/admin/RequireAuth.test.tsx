import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireAuth from "./RequireAuth";

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));
vi.mock("./AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

afterEach(() => {
  useAuthMock.mockReset();
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/admin/secret" element={<div>SECRET</div>} />
        </Route>
        <Route path="/admin/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("renders the loading placeholder while auth is still bootstrapping", () => {
    useAuthMock.mockReturnValue({
      admin: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    const { getByText } = renderAt("/admin/secret");
    expect(getByText("Lade…")).toBeTruthy();
  });

  it("redirects to /admin/login when there is no admin session", () => {
    useAuthMock.mockReturnValue({
      admin: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    const { getByText, queryByText } = renderAt("/admin/secret");
    expect(getByText("LOGIN")).toBeTruthy();
    expect(queryByText("SECRET")).toBeNull();
  });

  it("renders the protected outlet when an admin is logged in", () => {
    useAuthMock.mockReturnValue({
      admin: { id: 1, email: "eva@example.com" },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    const { getByText } = renderAt("/admin/secret");
    expect(getByText("SECRET")).toBeTruthy();
  });
});
