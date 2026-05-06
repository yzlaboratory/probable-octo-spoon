import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Layout", () => {
  it("renders the public Header and the matched child route via <Outlet />", () => {
    // Header fetches sponsors; stub fetch so the test stays deterministic.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );

    const { container, getByText } = render(
      <MemoryRouter initialEntries={["/test-child"]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/test-child" element={<div>child route content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelector("header")).toBeInTheDocument();
    expect(getByText("child route content")).toBeInTheDocument();
    expect(container.querySelector(".public-shell")).toBeInTheDocument();
  });
});
