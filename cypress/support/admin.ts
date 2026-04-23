// Admin auth helper. Credentials come from Cypress env (CYPRESS_ADMIN_EMAIL /
// CYPRESS_ADMIN_PASSWORD). Use `getAdminCreds()` to skip a spec cleanly when
// they are missing so CI without secrets stays green.

export interface AdminCreds {
  email: string;
  password: string;
}

export function getAdminCreds(): AdminCreds | null {
  const email = Cypress.env("ADMIN_EMAIL");
  const password = Cypress.env("ADMIN_PASSWORD");
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return null;
  }
  return { email, password };
}

export function loginViaForm({ email, password }: AdminCreds) {
  cy.visit("/admin/login");
  cy.get('input[type="email"]').clear().type(email);
  cy.get('input[type="password"]').clear().type(password, { log: false });
  cy.contains("button", "Anmelden").click();
}

// Cached login — use in beforeEach for admin flows that don't test the login
// form itself. Re-submits the form only when the session cookie is stale.
export function adminSession(creds: AdminCreds) {
  cy.session(
    ["admin", creds.email],
    () => {
      loginViaForm(creds);
      cy.location("pathname", { timeout: 10000 }).should("not.eq", "/admin/login");
    },
    {
      validate() {
        cy.request({ url: "/api/auth/me", failOnStatusCode: false })
          .its("status")
          .should("eq", 200);
      },
    },
  );
}
