import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );
}

describe("Header", () => {
  it("renders the wordmark, both nav rows, and the Instagram + Login links", () => {
    const { container } = renderAt("/");
    expect(container.textContent).toContain("SVALEMANNIA");
    expect(container.textContent).toContain("THALEXWEILER");
    // Two <nav> elements: desktop + mobile.
    expect(container.querySelectorAll("nav").length).toBe(2);
    // Instagram link uses the official handle URL.
    expect(
      container.querySelector(
        "a[href='https://www.instagram.com/sgthalexweileraschbach/']",
      ),
    ).not.toBeNull();
    // Admin login link only shown on lg.
    expect(container.querySelector("a[href='/admin']")).not.toBeNull();
  });

  it("marks the Start link active when at /", () => {
    const { container } = renderAt("/");
    const links = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("a.navlink"),
    );
    const start = links.find((a) => a.textContent === "Start");
    const spiele = links.find((a) => a.textContent === "Spiele");
    // `end: true` on the Start NavLink means it activates only on exact "/".
    expect(start?.classList.contains("active")).toBe(true);
    expect(spiele?.classList.contains("active")).toBe(false);
  });

  it("marks the Spiele link active when on /spiele and not Start (because Start has end:true)", () => {
    const { container } = renderAt("/spiele");
    const links = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("a.navlink"),
    );
    const start = links.find((a) => a.textContent === "Start");
    const spiele = links.find((a) => a.textContent === "Spiele");
    expect(start?.classList.contains("active")).toBe(false);
    expect(spiele?.classList.contains("active")).toBe(true);
  });

  it("renders all three top-level routes in both desktop and mobile nav", () => {
    const { container } = renderAt("/");
    const labels = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("a.navlink"),
    ).map((a) => a.textContent);
    // Three labels × two nav rows = six total link elements.
    expect(labels.filter((l) => l === "Start").length).toBe(2);
    expect(labels.filter((l) => l === "Spiele").length).toBe(2);
    expect(labels.filter((l) => l === "Training").length).toBe(2);
  });
});
