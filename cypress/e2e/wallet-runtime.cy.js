import { installMock } from "../../lib/gnus/mock/install";

const FIRST = "0xa1a1...a1a1";
const SECOND = "0xa2a2...a2a2";

describe("runtime wallet states on the mock", () => {
  let mock;
  let page;
  const visit = (profile) =>
    cy.visit("/", {
      onBeforeLoad(win) {
        page = win;
        mock = installMock(win, { profile });
      },
    });
  const header = (address = FIRST) => cy.contains("Earning as", { timeout: 12000 }).should("contain", address);

  it("shows the switching banner, then the new identity", () => {
    visit("switching");
    cy.contains("Switching account");
    cy.contains("Submitting is paused until GeniusWallet finishes switching.");
    header(SECOND);
    cy.contains("Switching account").should("not.exist");
  });

  it("replaces the address on a switch and leaves nothing of the old one", () => {
    visit("today");
    header();
    cy.then(() => mock.controls.switchAccount());
    header(SECOND);
    cy.contains(FIRST).should("not.exist");
  });

  it("shows Wrong network for another SDK network and the new label", () => {
    visit("today");
    header();
    cy.then(() => mock.controls.setNetwork({ sdk: "mainnet", evmChainId: 1 }));
    cy.contains("Wrong network");
    cy.contains("GeniusWallet is on mainnet. This dashboard works on staging. Switch the network in GeniusWallet.");
    cy.contains("Network: mainnet, chain 1");
  });

  it("shows the network the wallet reports on another EVM chain without blocking", () => {
    visit("today");
    header();
    cy.then(() => mock.controls.setNetwork({ sdk: "staging", evmChainId: 97 }));
    cy.contains("Network: staging, chain 97");
    cy.contains("Wrong network").should("not.exist");
  });

  it("shows not responding after a disconnect and Retry reconnects", () => {
    visit("today");
    header();
    cy.then(() => mock.controls.disconnect());
    cy.get("h1").should("have.text", "GeniusWallet isn't responding");
    cy.contains("GeniusWallet closed its connection to this page.");
    cy.contains("button", "Retry").click();
    header();
  });

  it("asks again after a revoke when the tab comes back", () => {
    visit("today");
    header();
    cy.then(() => {
      mock.controls.revokeOrigin();
      page.dispatchEvent(new page.Event("visibilitychange"));
      mock.controls.answerConnect(false);
    });
    cy.get("h1").should("have.text", "Allow this site in GeniusWallet");
    cy.contains("button", "Connect again").click();
    cy.get("h1").should("have.text", "Confirm in your wallet");
    cy.then(() => mock.controls.answerConnect(true));
    header();
  });
});
