import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VorstandSection from "./VorstandSection";

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

describe("VorstandSection", () => {
  it("renders the VORSTAND header even before data loads", () => {
    let _resolve!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((r) => {
            _resolve = r;
          }),
      ),
    );
    const { container } = render(
      <MemoryRouter>
        <VorstandSection />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("VORSTAND");
    // Hook resolved to null → empty member list, no Vorstandcards yet.
    expect(container.querySelectorAll(".vorstandcard").length).toBe(0);
  });

  it("renders one Vorstandcard per loaded member", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          {
            id: 1,
            name: "Anna",
            role: "1. Vorsitzende",
            email: "anna@example.com",
            phone: "0151 0000 0001",
            portrait: null,
          },
          {
            id: 2,
            name: "Bert",
            role: "Kassenwart",
            email: null,
            phone: null,
            portrait: null,
          },
        ]),
      ),
    );
    const { container } = render(
      <MemoryRouter>
        <VorstandSection />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelectorAll(".vorstandcard").length).toBe(2);
    });
    expect(container.textContent).toContain("Anna");
    expect(container.textContent).toContain("Bert");
  });
});
