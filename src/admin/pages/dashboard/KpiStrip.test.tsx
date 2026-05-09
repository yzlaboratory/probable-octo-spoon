import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { KpiStrip } from "./KpiStrip";

const baseProps = {
  news: { published: 12, drafts: 2, scheduled: 1, withdrawn: 0 },
  sponsors: { active: 8, paused: 1, archived: 3 },
  vorstand: { active: 7, withoutPortrait: 1 },
};

describe("KpiStrip", () => {
  it("renders all four KPI cards", () => {
    const { getByTestId, getAllByTestId } = render(<KpiStrip {...baseProps} />);
    expect(getByTestId("kpi-strip")).toBeTruthy();
    expect(getAllByTestId("kpi-card")).toHaveLength(4);
  });

  it("shows the news published count and composed subline", () => {
    const { getByText } = render(<KpiStrip {...baseProps} />);
    expect(getByText("Meldungen")).toBeTruthy();
    expect(getByText("12")).toBeTruthy();
    expect(getByText("+1 geplant · 2 Entwürfe")).toBeTruthy();
  });

  it("shows the sponsor active count and paused/archived subline", () => {
    const { getByText } = render(<KpiStrip {...baseProps} />);
    expect(getByText("Aktive Sponsoren")).toBeTruthy();
    expect(getByText("8")).toBeTruthy();
    expect(getByText("1 pausiert · 3 archiviert")).toBeTruthy();
  });

  it("shows the vorstand active count and missing-portrait subline", () => {
    const { getByText } = render(<KpiStrip {...baseProps} />);
    expect(getByText("Vorstandsmitglieder")).toBeTruthy();
    expect(getByText("7")).toBeTruthy();
    expect(getByText("1 ohne Portrait")).toBeTruthy();
  });

  it("shows a muted 'Bald verfügbar' card for page-views (no data source yet)", () => {
    const { getByText } = render(<KpiStrip {...baseProps} />);
    expect(getByText("Seitenaufrufe / 7 T.")).toBeTruthy();
    expect(getByText("Bald verfügbar")).toBeTruthy();
    // The "—" is the muted value glyph.
    expect(getByText("—")).toBeTruthy();
  });

  it("renders the value 0 (not as 'falsy hidden')", () => {
    const { getAllByText } = render(
      <KpiStrip
        news={{ published: 0, drafts: 0, scheduled: 0, withdrawn: 0 }}
        sponsors={{ active: 0, paused: 0, archived: 0 }}
        vorstand={{ active: 0, withoutPortrait: 0 }}
      />,
    );
    // Three real KPI cards all show 0 as their headline value.
    expect(getAllByText("0")).toHaveLength(3);
  });
});
