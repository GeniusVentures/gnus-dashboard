import { installMock } from "../../lib/gnus/mock/install";

describe("connect and identity", () => {
  it("shows both identities and the network from gnus_getAccounts", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        installMock(win, {});
      },
    });
    cy.contains("Earning as").should("contain", "0xa1a1...a1a1");
    cy.contains("Paying from").should("contain", "0xb2b2...b2b2");
    cy.contains("Network: staging, chain 80002");
    cy.get("h1").should("have.text", "Dashboard");
  });

  it("asks for GeniusWallet when there is none", () => {
    cy.visit("/");
    cy.get("h1", { timeout: 6000 }).should("have.text", "GeniusWallet required");
    cy.contains("a", "Get GeniusWallet")
      .should("have.attr", "href", "https://gnus.ai/")
      .and("have.attr", "target", "_blank");
    cy.contains("button", /submit/i).should("not.exist");
  });
});
