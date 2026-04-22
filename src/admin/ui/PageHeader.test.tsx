import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title as an h1", () => {
    const { getByRole } = render(<PageHeader title="Übersicht" />);
    expect(getByRole("heading", { level: 1 }).textContent).toBe("Übersicht");
  });

  it("renders the eyebrow when provided", () => {
    const { getByText } = render(<PageHeader title="t" eyebrow="Entwürfe" />);
    expect(getByText("Entwürfe")).toBeInTheDocument();
  });

  it("omits the eyebrow when not provided", () => {
    const { container } = render(<PageHeader title="t" />);
    expect(container.querySelector(".caps")).toBeNull();
  });

  it("renders a subtitle when provided", () => {
    const { getByText } = render(
      <PageHeader title="t" subtitle="Lorem ipsum dolor" />,
    );
    expect(getByText("Lorem ipsum dolor")).toBeInTheDocument();
  });

  it("omits the subtitle when not provided", () => {
    const { container } = render(<PageHeader title="t" />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("renders the right slot", () => {
    const { getByTestId } = render(
      <PageHeader
        title="t"
        right={<button data-testid="action">Neu</button>}
      />,
    );
    expect(getByTestId("action")).toBeInTheDocument();
  });

  it("accepts ReactNode titles, not just strings", () => {
    const { getByTestId } = render(
      <PageHeader title={<em data-testid="em">Italics</em>} />,
    );
    expect(getByTestId("em").textContent).toBe("Italics");
  });

  it("applies the font-display class for the Newsreader wordmark", () => {
    const { getByRole } = render(<PageHeader title="x" />);
    expect(getByRole("heading", { level: 1 }).className).toContain("font-display");
  });
});
