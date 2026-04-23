import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TermineCard } from "./TermineCard";

describe("TermineCard", () => {
  it("renders the section heading", () => {
    const { getByText } = render(<TermineCard />);
    expect(getByText("Nächste Termine")).toBeTruthy();
  });

  it("shows the 'bald' badge in the header", () => {
    const { getByText } = render(<TermineCard />);
    expect(getByText("bald")).toBeTruthy();
  });

  it("renders the empty-state copy", () => {
    const { getByText } = render(<TermineCard />);
    expect(getByText("Bald verfügbar.")).toBeTruthy();
  });
});
