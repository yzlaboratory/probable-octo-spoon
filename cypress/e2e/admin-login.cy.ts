import { getAdminCreds, loginViaForm } from "../support/admin";

const creds = getAdminCreds();

describe("Admin login", () => {
  if (!creds) {
    it.skip("requires CYPRESS_ADMIN_EMAIL / CYPRESS_ADMIN_PASSWORD", () => {});
    return;
  }

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("renders the login form with the redesigned shell", () => {
    cy.visit("/admin/login");
    cy.contains("h1", "Admin-Bereich").should("be.visible");
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
    cy.contains("button", "Anmelden").should("be.enabled");
  });

  it("redirects unauthenticated /admin visits to /admin/login", () => {
    cy.visit("/admin");
    cy.location("pathname").should("eq", "/admin/login");
  });

  it("logs in with valid credentials and lands inside the admin area", () => {
    loginViaForm(creds);
    cy.location("pathname", { timeout: 10000 }).should("match", /^\/admin(\/|$)/);
    cy.location("pathname").should("not.eq", "/admin/login");
    cy.contains(/Admin-Bereich/).should("not.exist");
  });

  it("rejects wrong passwords and keeps the user on the login page", () => {
    cy.visit("/admin/login");
    cy.get('input[type="email"]').type(creds.email);
    cy.get('input[type="password"]').type("definitely-not-the-password-xyz", {
      log: false,
    });
    cy.contains("button", "Anmelden").click();
    cy.get('[role="alert"]', { timeout: 5000 }).should("be.visible");
    cy.location("pathname").should("eq", "/admin/login");
  });

  it("normalizes the email (trims + lowercases) before submitting", () => {
    cy.visit("/admin/login");
    cy.get('input[type="email"]').type(`  ${creds.email.toUpperCase()}  `);
    cy.get('input[type="password"]').type(creds.password, { log: false });
    cy.contains("button", "Anmelden").click();
    cy.location("pathname", { timeout: 10000 }).should("not.eq", "/admin/login");
  });

  it("blocks submission when the password is empty (native validation)", () => {
    cy.visit("/admin/login");
    cy.get('input[type="email"]').type(creds.email);
    cy.contains("button", "Anmelden").click();
    cy.location("pathname").should("eq", "/admin/login");
    cy.get('input[type="password"]:invalid').should("exist");
  });

  it("persists the session across a page reload", () => {
    loginViaForm(creds);
    cy.location("pathname", { timeout: 10000 }).should("not.eq", "/admin/login");
    cy.reload();
    cy.location("pathname").should("not.eq", "/admin/login");
    cy.request("/api/auth/me").its("status").should("eq", 200);
  });

  it("logs out and returns the user to the login page on next admin visit", () => {
    loginViaForm(creds);
    cy.location("pathname", { timeout: 10000 }).should("not.eq", "/admin/login");
    cy.getCookie("clubsoft_csrf").then((cookie) => {
      cy.request({
        method: "POST",
        url: "/api/auth/logout",
        headers: cookie ? { "X-CSRF-Token": cookie.value } : {},
      });
    });
    cy.visit("/admin");
    cy.location("pathname").should("eq", "/admin/login");
  });
});
