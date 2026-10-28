import { installMock } from "../../lib/gnus/mock/install";

// The export is built without a Reown project id, so the browser path loads its module and stops at
// "GeniusWallet required"; Reown's own client is only fetched once an id exists.
describe("WalletConnect stays out of the wallet", () => {
  let chunks;
  const watch = () => {
    cy.intercept(`**/${chunks.module}`, cy.spy().as("module"));
    cy.intercept(`**/${chunks.relay}`, cy.spy().as("relay"));
    cy.intercept(/walletconnect|reown/i, cy.spy().as("hosts"));
  };
  const nothingElse = () => {
    cy.get("@relay").should("not.have.been.called");
    cy.get("@hosts").should("not.have.been.called");
  };

  before(() => {
    cy.task("walletConnectChunks").then((found) => {
      chunks = found;
    });
  });

  // Static files are immutable, so a chunk loaded by an earlier test would come from the cache and never reach the spies.
  beforeEach(() => {
    const send = (command, params = {}) => Cypress.automation("remote:debugger:protocol", { command, params });
    cy.then(() => send("Network.enable"));
    cy.then(() => send("Network.setCacheDisabled", { cacheDisabled: true }));
  });

  it("a browser with no wallet asks for the module once and shows GeniusWallet required", () => {
    watch();
    cy.visit("/");
    cy.contains("h1", "GeniusWallet required", { timeout: 12000 });
    cy.get("@module").should("have.been.calledOnce");
    nothingElse();
  });

  it("the mock injected at 0 ms never asks for it", () => {
    watch();
    cy.visit("/", { onBeforeLoad: (win) => installMock(win, { injectAfterMs: 0 }) });
    cy.contains("Earning as", { timeout: 12000 });
    cy.wait(3500);
    cy.get("@module").should("not.have.been.called");
    nothingElse();
  });

  it("the wallet's user-agent marker with an injection at 500 ms never asks for it", () => {
    watch();
    cy.visit("/", {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, "userAgent", {
          configurable: true,
          value: `${win.navigator.userAgent} GeniusWallet/4.0.0 gnus/1`,
        });
        installMock(win, { injectAfterMs: 500 });
      },
    });
    cy.contains("Earning as", { timeout: 12000 });
    cy.wait(3500);
    cy.get("@module").should("not.have.been.called");
    nothingElse();
  });

  it("the mock injected without the marker, after the 3 s wait, takes over from the browser path", () => {
    watch();
    cy.visit("/", { onBeforeLoad: (win) => installMock(win, { injectAfterMs: 4000 }) });
    cy.contains("h1", "GeniusWallet required", { timeout: 12000 });
    cy.contains("Earning as", { timeout: 12000 });
    cy.get("@module").should("have.been.calledOnce");
    nothingElse();
  });
});
