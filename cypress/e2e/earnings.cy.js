import { installMock } from "../../lib/gnus/mock/install";

let mock;
const visit = (profile = "today") =>
  cy.visit("/earnings", {
    onBeforeLoad(win) {
      mock = installMock(win, { profile });
    },
  });

describe("Earnings on the today profile", () => {
  it("shows the node account's balance and processing, and every null as Not available yet", () => {
    visit();
    cy.get("h1", { timeout: 12000 }).should("have.text", "Earnings");
    cy.contains("For the account that earns: 0xa1a1...a1a1");
    cy.contains("These figures cover this account only, not its child accounts.");
    cy.contains("dd", "12 GNUS");
    cy.contains("This node is processing jobs.");
    cy.contains("The network doesn't report processed jobs per account yet.");
    cy.contains("The network doesn't report earnings per account yet.");
    cy.contains("Your earnings history shows up here once the network reports it.");
    cy.get("main").invoke("text").then((text) => expect(text.match(/Not available yet/g)).to.have.length(3));
    cy.get("table").should("not.exist");
  });
});

const reads = () => mock.controls.calls.filter((c) => c.method === "gnus_getEarnings").length;

describe("Earnings in other states", () => {
  it("populated: counts, earned total and a history row with the job id as text", () => {
    visit("populated");
    cy.contains("dd", "42", { timeout: 12000 });
    cy.contains("dd", "7 GNUS");
    cy.get("tbody tr").should("have.length", 1).and("contain", "1 GNUS").and("contain", "job-0");
    cy.get("tbody a").should("not.exist");
  });

  it("bigAmounts: exact above 2^53", () => {
    visit("bigAmounts");
    cy.contains("dd", "0.009007199254740993 GNUS", { timeout: 12000 });
    cy.contains("dd", "18.446744073709551617 GNUS");
  });

  it("readsFail: the error state with Retry", () => {
    visit("readsFail");
    cy.contains("h2", "Couldn't load your earnings", { timeout: 12000 });
    cy.contains("GeniusWallet hit an internal error.");
    cy.contains("button", "Retry");
    cy.get("h1").should("have.text", "Earnings");
  });

  it("Refresh sends one more read, and the page says when it was last updated", () => {
    visit("today");
    cy.contains("Last updated", { timeout: 12000 });
    cy.then(() => expect(reads()).to.eq(1));
    cy.contains("button", "Refresh").click();
    cy.then(() => expect(reads()).to.eq(2));
    cy.contains("button", "Refresh").should("be.enabled");
  });

  it("a node account switch re-reads and shows the new account", () => {
    visit("today");
    cy.contains("For the account that earns: 0xa1a1...a1a1", { timeout: 12000 });
    cy.then(() => mock.controls.switchAccount());
    cy.contains("For the account that earns: 0xa2a2...a2a2");
    cy.then(() => expect(reads()).to.eq(2));
  });
});

