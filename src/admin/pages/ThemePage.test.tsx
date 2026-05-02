import { describe, expect, it, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ThemePage from "./ThemePage";
import { DEFAULT_DRAFT, STORAGE_KEY, type ThemeDraft } from "../theme/draft";

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemePage />
    </MemoryRouter>,
  );
}

function readStored(): ThemeDraft | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ThemeDraft) : null;
}

describe("ThemePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the page heading and the disabled publish button", () => {
    const { getByText, getByRole } = renderPage();
    expect(getByText("Erscheinungsbild der Website")).toBeInTheDocument();
    const publish = getByRole("button", {
      name: "Übernehmen & veröffentlichen",
    }) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
    expect(publish.getAttribute("title")).toMatch(/Bald verfügbar/i);
  });

  it("renders all four palette options and the preview", () => {
    const { getByText, getByTestId } = renderPage();
    expect(getByText("Midnight · Purple & Coral")).toBeInTheDocument();
    expect(getByText("Deep · Navy & Gold")).toBeInTheDocument();
    expect(getByText("Kiosk · Schwarz & Zinnober")).toBeInTheDocument();
    expect(getByText("Light · Grün-Weiß")).toBeInTheDocument();
    expect(getByTestId("theme-preview")).toBeInTheDocument();
  });

  it("hydrates the editor from a stored draft on mount", () => {
    const stored: ThemeDraft = {
      ...DEFAULT_DRAFT,
      palette: "navy",
      density: "compact",
      darkNav: false,
      baseSizePx: 19,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const { getByText, getByLabelText } = renderPage();
    const navyRow = getByText("Deep · Navy & Gold").closest(
      "button",
    ) as HTMLButtonElement;
    expect(navyRow.getAttribute("aria-pressed")).toBe("true");
    const compact = getByText("Kompakt").closest("button") as HTMLButtonElement;
    expect(compact.getAttribute("aria-pressed")).toBe("true");
    const darkNav = getByLabelText("Dunkles Menü") as HTMLButtonElement;
    expect(darkNav.getAttribute("aria-checked")).toBe("false");
    expect(getByText("19 px")).toBeInTheDocument();
  });

  it("falls back to defaults when stored JSON is corrupted", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not-json");
    const { getByText } = renderPage();
    const editorial = getByText("Midnight · Purple & Coral").closest(
      "button",
    ) as HTMLButtonElement;
    expect(editorial.getAttribute("aria-pressed")).toBe("true");
    expect(getByText("16 px")).toBeInTheDocument();
  });

  it("persists palette changes to localStorage", () => {
    const { getByText } = renderPage();
    const moss = getByText("Light · Grün-Weiß").closest(
      "button",
    ) as HTMLButtonElement;
    fireEvent.click(moss);
    const stored = readStored();
    expect(stored?.palette).toBe("moss");
    expect(stored?.updatedAt).not.toBe(DEFAULT_DRAFT.updatedAt);
  });

  it("does not stamp updatedAt on the initial mount alone", () => {
    // Pre-load a draft that has a known updatedAt; simply mounting the page
    // must not change it (only an actual edit should).
    const original: ThemeDraft = {
      ...DEFAULT_DRAFT,
      palette: "moss",
      updatedAt: "2026-04-01T10:00:00.000Z",
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(original));
    renderPage();
    const stored = readStored();
    expect(stored?.updatedAt).toBe("2026-04-01T10:00:00.000Z");
  });

  it("toggles the dark-menu switch and persists the change", () => {
    const { getByLabelText } = renderPage();
    const darkNav = getByLabelText("Dunkles Menü") as HTMLButtonElement;
    expect(darkNav.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(darkNav);
    expect(darkNav.getAttribute("aria-checked")).toBe("false");
    expect(readStored()?.darkNav).toBe(false);
  });

  it("updates the base-size readout when the slider moves", () => {
    const { getByLabelText, getByText } = renderPage();
    const slider = getByLabelText("Basisgröße") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "18" } });
    expect(getByText("18 px")).toBeInTheDocument();
    expect(readStored()?.baseSizePx).toBe(18);
  });

  it("Verwerfen clears the stored draft and resets the form", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_DRAFT,
        palette: "kiosk",
        density: "compact",
      } satisfies ThemeDraft),
    );
    const { getByText } = renderPage();
    const kiosk = getByText("Kiosk · Schwarz & Zinnober").closest(
      "button",
    ) as HTMLButtonElement;
    expect(kiosk.getAttribute("aria-pressed")).toBe("true");

    act(() => {
      fireEvent.click(getByText("Verwerfen"));
    });

    const editorial = getByText("Midnight · Purple & Coral").closest(
      "button",
    ) as HTMLButtonElement;
    expect(editorial.getAttribute("aria-pressed")).toBe("true");
    // Verwerfen wipes the key, then the persistence effect re-saves the
    // default state — either is acceptable; what matters is the state matches
    // defaults.
    const stored = readStored();
    if (stored) {
      expect(stored.palette).toBe(DEFAULT_DRAFT.palette);
      expect(stored.density).toBe(DEFAULT_DRAFT.density);
    }
  });

  it("hides the preview Instagram strip when the toggle is off", () => {
    const { getByLabelText, queryByText, getByText } = renderPage();
    expect(getByText("Aus dem Instagram-Feed")).toBeInTheDocument();
    fireEvent.click(getByLabelText("Instagram-Galerie auf Startseite"));
    expect(queryByText("Aus dem Instagram-Feed")).toBeNull();
  });
});
