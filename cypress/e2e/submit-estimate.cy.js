import { installMock } from "../../lib/gnus/mock/install";

let mock;
const estimate = (profile) => {
  cy.visit("/submit", {
    onBeforeLoad(win) {
      mock = installMock(win, { profile });
    },
  });
  cy.get("h1", { timeout: 12000 }).should("have.text", "Submit a job");
  cy.contains("button", "Load example").click();
  cy.contains("button", "Estimate cost").click();
};
const pay = () => cy.contains("button", "Pay and submit");

describe("estimate states on the export", () => {
  it("today: cost, balance and gas in GNUS, submit enabled", () => {
    estimate("today");
    cy.contains("dd", "3 GNUS");
    cy.contains("dd", "50 GNUS");
    cy.contains("dd", "30.5 gwei (POL)");
    pay().should("be.enabled");
  });

  it("costUnavailable: Price unavailable and submit off", () => {
    estimate("costUnavailable");
    cy.contains("[role=alert]", "Price unavailable");
    cy.contains("[role=alert]", "GeniusWallet couldn't get a price for this job.");
    pay().should("be.disabled");
  });

  it("insufficientBalance: both amounts, submit off", () => {
    estimate("insufficientBalance");
    cy.contains("[role=alert]", "Not enough GNUS");
    cy.contains("[role=alert]", "This job costs 3 GNUS. The paying wallet holds 1 GNUS.");
    pay().should("be.disabled");
  });

  it("allNulls: gas and balance not available, submit off with the no-paying-wallet words", () => {
    estimate("allNulls");
    cy.contains("dd", "Gas not estimated");
    cy.contains("dd", "Balance not available");
    cy.contains("There is no paying wallet in GeniusWallet. Add one first.");
    pay().should("be.disabled");
  });

  it("bridgeUnavailable: the switch-network message and submit off", () => {
    estimate("bridgeUnavailable");
    cy.contains("[role=alert]", "Not available on this network. Switch the network in GeniusWallet.");
    pay().should("be.disabled");
  });

  it("bigAmounts: amounts above 2^53 show exactly", () => {
    estimate("bigAmounts");
    cy.contains("dd", "1000 GNUS");
    cy.contains("dd", "5000 GNUS");
    pay().should("be.enabled");
  });

  it("an edit after an estimate needs a new one", () => {
    estimate("today");
    cy.contains("dd", "3 GNUS");
    cy.get("#job-json").type(" ");
    cy.contains("The job changed. Estimate again before you submit.");
    cy.contains("dd", "3 GNUS").should("not.exist");
    pay().should("be.disabled");
    cy.contains("button", "Estimate cost").click();
    cy.contains("dd", "3 GNUS");
    pay().should("be.enabled");
  });
});
