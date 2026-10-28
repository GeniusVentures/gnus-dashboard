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

  it("loads the second page, then offers no more", () => {
    visit("/jobs");
    cy.contains("button", "Load more jobs", { timeout: 12000 }).click();
    cy.get("tbody tr").should("have.length", 25);
    cy.contains("button", "Load more jobs").should("not.exist");
    cy.get("tbody tr").eq(20).find("a").should("have.focus");
    cy.contains("Showing 25 jobs");
  });

  it("shows the empty state for an account with no jobs", () => {
    visit("/jobs", "today");
    cy.contains("h2", "No jobs yet", { timeout: 12000 });
    cy.contains("a", "Submit a job").should("have.attr", "href", "/submit");
    cy.get("table").should("not.exist");
  });

  it("shows the error state with Retry when the list cannot be read", () => {
    visit("/jobs", "readsFail");
    cy.contains("h2", "Couldn't load your jobs", { timeout: 12000 });
    cy.contains("GeniusWallet hit an internal error.");
    cy.contains("button", "Retry");
    cy.get("h1").should("have.text", "My jobs");
  });

  it("empties the list when the node account switches", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.then(() => mock.controls.switchAccount());
    cy.contains("h2", "No jobs yet");
    cy.get("table").should("not.exist");
  });

  it("marks paid-but-not-processed and unconfirmed rows with their explanation", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.contains("td", "Paid but not processed").should("contain", "Check it in GeniusWallet.");
    cy.contains("td", "Payment not confirmed").should("contain", "The GNUS may be spent");
    cy.contains("td", "Submitted to the network").should("not.contain", "GeniusWallet can't report");
  });
});
