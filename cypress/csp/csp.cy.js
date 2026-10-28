import { installMock } from "../../lib/gnus/mock/install";

const completedJob = `0x7e57${"0".repeat(59)}4`;

// Run with `yarn test:csp`: Cypress strips the CSP headers unless experimentalCspAllowList is on.
describe("Content-Security-Policy on the export", () => {
  let violations;

  const visit = (path, { profile, install = true, failOnStatusCode = true } = {}) =>
    cy.visit(path, {
      failOnStatusCode,
      onBeforeLoad(win) {
        violations = [];
        win.document.addEventListener("securitypolicyviolation", (event) => {
          violations.push(`${event.violatedDirective} blocked ${event.blockedURI || "inline"}`);
        });
        if (install) {
          installMock(win, { profile });
        }
      },
    });

  const clean = () => {
    cy.wait(500);
    cy.then(() => expect(violations).to.deep.equal([]));
  };

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
    clean();
  });

  it("the submit page, from loading the example to an outcome, has zero violations", () => {
    visit("/submit");
    cy.contains("button", "Load example", { timeout: 12000 }).click();
    cy.contains("button", "Estimate cost").should("be.enabled").click();
    cy.contains("button", "Pay and submit", { timeout: 12000 }).should("be.enabled").click();
    cy.contains("h2", "Job submitted", { timeout: 12000 });
    clean();
  });

  it("My jobs and a job detail with a result have zero violations", () => {
    visit("/jobs", { profile: "jobResults" });
    cy.get("tbody tr", { timeout: 12000 }).should("have.length.greaterThan", 0);
    clean();
    visit(`/jobs/detail?hash=${completedJob}`, { profile: "jobResults" });
    cy.contains("Completed", { timeout: 12000 });
    clean();
  });

  it("Earnings has zero violations", () => {
    visit("/earnings", { profile: "populated" });
    cy.contains("h1", "Earnings", { timeout: 12000 });
    cy.contains("Refresh", { timeout: 12000 });
    clean();
  });

  it("the browser path with no wallet loads WalletConnect and has zero violations", () => {
    visit("/", { install: false });
    cy.contains("h1", "GeniusWallet required", { timeout: 12000 });
    clean();
  });

  it("the 404 page has zero violations", () => {
    visit("/no-such-page", { failOnStatusCode: false });
    cy.contains("h1", "Page not found", { timeout: 12000 });
    clean();
  });
});
