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

describe("connect-time states on the mock", () => {
  let mock;
  const visit = (options) =>
    cy.visit("/", {
      onBeforeLoad(win) {
        mock = installMock(win, options);
      },
    });
  const header = () => {
    cy.contains("Earning as", { timeout: 12000 }).should("contain", "0xa1a1...a1a1");
    cy.contains("Network: staging, chain 80002");
  };

  it("waits for the connect prompt, then shows the identities", () => {
    visit({ profile: "connectPrompt" });
    cy.get("h1").should("have.text", "Confirm in your wallet");
    cy.then(() => mock.controls.answerConnect(true));
    header();
  });

  it("recovers from a declined prompt with Connect again", () => {
    visit({ profile: "connectPrompt" });
    cy.get("h1").should("have.text", "Confirm in your wallet");
    cy.then(() => mock.controls.answerConnect(false));
    cy.get("h1").should("have.text", "Allow this site in GeniusWallet");
    cy.contains("You declined the connection.");
    cy.contains("button", "Connect again").click();
    cy.get("h1").should("have.text", "Confirm in your wallet");
    cy.then(() => mock.controls.answerConnect(true));
    header();
  });

  it("keeps the not-allowed screen when Connect again is refused again", () => {
    visit({ profile: "originNotAllowed" });
    cy.get("h1").should("have.text", "Allow this site in GeniusWallet");
    cy.contains("GeniusWallet hasn't allowed this site.");
    cy.contains("button", "Connect again").click();
    cy.get("h1").should("have.text", "Allow this site in GeniusWallet");
    cy.contains("GeniusWallet hasn't allowed this site.");
  });

  it("shows starting up, then connects without a click", () => {
    visit({ profile: "sdkStarting" });
    cy.get("h1").should("have.text", "GeniusWallet is starting up");
    cy.contains("button", "Try now");
    header();
  });

  it("asks for an update when the contract drifted", () => {
    visit({ profile: "malformedSwappedAddress" });
    cy.get("h1").should("have.text", "Update GeniusWallet");
    cy.contains("Wallet contract mismatch");
  });

  it("moves from GeniusWallet required to connected when the wallet arrives late", () => {
    visit({ injectAfterMs: 4000 });
    cy.get("h1", { timeout: 6000 }).should("have.text", "GeniusWallet required");
    header();
  });
});
