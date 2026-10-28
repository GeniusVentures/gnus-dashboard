import { installMock } from "../../lib/gnus/mock/install";

// Run with `yarn test:csp`: Cypress strips the CSP headers unless experimentalCspAllowList is on.
describe("Content-Security-Policy on the export", () => {
  let violations;

  const visit = (path, install = true) =>
    cy.visit(path, {
      onBeforeLoad(win) {
        violations = [];
        win.document.addEventListener("securitypolicyviolation", (event) => {
          violations.push(`${event.violatedDirective} blocked ${event.blockedURI || "inline"}`);
        });
        if (install) {
          installMock(win);
        }
      },
    });

  it("is served as the module says, and a planted violation is caught", () => {
    cy.task("expectedCsp").then(({ name, value }) => {
      cy.request("/").its(`headers.${name.toLowerCase()}`).should("eq", value);
    });
    visit("/");
    cy.contains("Earning as", { timeout: 12000 });
    cy.window().then((win) => {
      const img = win.document.createElement("img");
      img.src = "https://example.invalid/planted.png";
      win.document.body.appendChild(img);
    });
    cy.then(() => cy.wrap(violations, { timeout: 4000 }).should("have.length", 1));
    cy.then(() => expect(violations[0]).to.contain("img-src"));
  });

  it("the home page loads with zero violations", () => {
    visit("/");
    cy.contains("Earning as", { timeout: 12000 });
    cy.wait(500);
    cy.then(() => expect(violations).to.deep.equal([]));
  });
});
