import { installMock } from "../../lib/gnus/mock/install";

const routes = [
  { path: "/", h1: "Dashboard" },
  { path: "/submit", h1: "Submit a job" },
  { path: "/jobs", h1: "My jobs" },
  { path: "/jobs/detail", h1: "Job detail" },
  { path: "/earnings", h1: "Earnings" },
];

describe("static shell", () => {
  beforeEach(() => {
    cy.intercept("**/api/**", cy.spy().as("api"));
  });

  afterEach(() => {
    cy.get("@api").should("not.have.been.called");
  });

  routes.forEach(({ path, h1 }) => {
    it(`shows ${path}`, () => {
      cy.visit(path, {
        onBeforeLoad(win) {
          installMock(win, {});
        },
      });
      cy.get("h1").should("have.text", h1);
      cy.title().should("eq", `${h1} | GNUS.AI Dashboard`);
      cy.get("header").should("have.length", 1);
      cy.get("header nav a[href='/submit']").should("have.text", "Submit a job");
      cy.get("header nav a[href='/jobs']").should("have.text", "My jobs");
      cy.get("header nav a[href='/earnings']").should("have.text", "Earnings");
      cy.contains("header", "Earning as");
      cy.contains("header", "Paying from");
      cy.get("video").should("not.exist");
      cy.contains("Mainnet").should("not.exist");
      cy.get("footer a[href='https://www.gnus.ai/privacypolicy.html']").should("have.attr", "target", "_blank");
      cy.get("footer a[href='https://www.gnus.ai/tos.html']").should("have.attr", "target", "_blank");
      cy.get("footer a:not([target='_blank'])").should("not.exist");
      ["/analytics", "/job-orders", "/wallet"].forEach((gone) => {
        cy.get(`nav a[href='${gone}']`).should("not.exist");
      });
    });
  });

  it("answers an unknown path with 404 and the custom page", () => {
    cy.request({ url: "/no-such-page", failOnStatusCode: false })
      .its("status")
      .should("eq", 404);
    cy.visit("/no-such-page", { failOnStatusCode: false });
    cy.get("h1").should("have.text", "Page not found");
  });
});
