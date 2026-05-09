import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Topbar from "./Topbar";

// Uses different `useAuth` shapes per test by re-mocking the module dynamically.
const { mockAdmin } = vi.hoisted(() => ({
  mockAdmin: { current: { id: 1, email: "eva.schmidt@example.com" } },
}));
vi.mock("../AuthContext", () => ({
  useAuth: () => ({
    admin: mockAdmin.current,
    logout: vi.fn().mockResolvedValue(undefined),
    login: vi.fn(),
    refresh: vi.fn(),
    loading: false,
  }),
}));

function renderTopbar() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Topbar />
    </MemoryRouter>,
  );
}

describe("Topbar initials()", () => {
  it("derives 2-char initials from a single-word local-part email", () => {
    mockAdmin.current = { id: 2, email: "alice@example.com" };
    const { container } = renderTopbar();
    // The avatar circle holds the initials — 'AL' for 'alice'.
    expect(container.textContent).toMatch(/AL/);
  });
});
