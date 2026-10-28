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
