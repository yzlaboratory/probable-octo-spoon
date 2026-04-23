import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import Topbar from "./Topbar";

// A minimal stub of the auth context. The topbar only reads .admin and .logout.
vi.mock("../AuthContext", () => ({
  useAuth: () => ({
    admin: { id: 1, email: "eva.schmidt@example.com" },
    logout: loggedOut,
    login: vi.fn(),
    refresh: vi.fn(),
    loading: false,
  }),
}));
const loggedOut = vi.fn().mockResolvedValue(undefined);

function Wrapper({ children, path = "/admin/news" }: { children: ReactNode; path?: string }) {
  return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
}

describe("Topbar", () => {
  it("renders breadcrumbs for the current route", () => {
    const { getByLabelText } = render(
      <Wrapper path="/admin/news/42">
        <Topbar />
      </Wrapper>,
    );
    const crumbsNode = getByLabelText("Breadcrumb");
    expect(crumbsNode.textContent).toContain("SV Alemannia");
    expect(crumbsNode.textContent).toContain("News");
    expect(crumbsNode.textContent).toContain("Bearbeiten");
  });

  it("renders the search input with ⌘K hint", () => {
    const { getByPlaceholderText, getByText } = render(
      <Wrapper>
        <Topbar />
      </Wrapper>,
    );
    expect(getByPlaceholderText("Suchen…")).toBeInTheDocument();
    expect(getByText("⌘K")).toBeInTheDocument();
  });

  it("renders a link to the public website in a new tab", () => {
    const { getByText } = render(
      <Wrapper>
        <Topbar />
      </Wrapper>,
    );
    const link = getByText("Website ansehen").closest("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("exposes a notifications button with an accessible label", () => {
    const { getByLabelText } = render(
      <Wrapper>
        <Topbar />
      </Wrapper>,
    );
    expect(getByLabelText("Benachrichtigungen")).toBeInTheDocument();
  });

  it("derives initials from the admin email local-part", () => {
    const { container } = render(
      <Wrapper>
        <Topbar />
      </Wrapper>,
    );
    // "eva.schmidt" → ES
    expect(container.textContent).toContain("ES");
  });

  it("invokes logout when the sign-out button is clicked", async () => {
    loggedOut.mockClear();
    const { getByText } = render(
      <Wrapper>
        <Topbar />
      </Wrapper>,
    );
    fireEvent.click(getByText("Abmelden"));
    expect(loggedOut).toHaveBeenCalledTimes(1);
  });
});
