import { installMock } from "../../lib/gnus/mock/install";

let mock;
const visit = (path, profile = "jobHistory") =>
  cy.visit(path, {
    onBeforeLoad(win) {
      mock = installMock(win, { profile });
    },
  });
const hashOf = (n) => `0x5eed${n.toString(16).padStart(60, "0")}`;
const shortOf = (n) => `0x5eed...${n.toString(16).padStart(4, "0")}`;

describe("My jobs", () => {
  it("lists the seeded jobs newest first with their short ids and cost", () => {
    visit("/jobs");
    cy.get("h1", { timeout: 12000 }).should("have.text", "My jobs");
    cy.get("tbody tr").should("have.length", 20);
    cy.get("tbody tr").first().should("contain", shortOf(25)).and("contain", "3 GNUS");
    cy.get("tbody tr").last().should("contain", shortOf(6));
    cy.get("tbody tr")
      .first()
      .find("a")
      .should("have.attr", "href", `/jobs/detail?hash=${hashOf(25)}`);
  });
});
