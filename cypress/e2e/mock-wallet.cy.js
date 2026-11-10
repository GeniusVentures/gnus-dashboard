import { installMock } from "../../lib/gnus/mock/install";

const SDK_ADDRESS = /^0x[0-9a-f]{128}$/;

describe("mock wallet shared with Jest and the dev server", () => {
  it("injects after 500 ms and answers gnus_getAccounts", () => {
    let initialized = 0;
    cy.visit("/", {
      onBeforeLoad(win) {
        win.addEventListener("gnus#initialized", () => {
          initialized += 1;
        });
        installMock(win, { injectAfterMs: 500 });
      },
    });
    cy.window().should((win) => {
      expect(win.gnus && win.gnus.isGeniusWallet).to.eq(true);
    });
    cy.window()
      .then((win) => win.gnus.request({ method: "gnus_getAccounts" }))
      .then((accounts) => {
        expect(accounts.node.sdkAddress).to.match(SDK_ADDRESS);
        expect(initialized).to.eq(1);
      });
  });

  it("injects twice as two different objects", () => {
    let initialized = 0;
    let first = null;
    cy.visit("/", {
      onBeforeLoad(win) {
        win.addEventListener("gnus#initialized", () => {
          initialized += 1;
          first = first || win.gnus;
        });
        installMock(win, { injectTwice: true });
      },
    });
    cy.window().should((win) => {
      expect(initialized).to.eq(2);
      expect(win.gnus).to.not.eq(first);
    });
    cy.window()
      .then((win) => win.gnus.request({ method: "gnus_getAccounts" }))
      .then((accounts) => {
        expect(accounts.node.sdkAddress).to.match(SDK_ADDRESS);
      });
  });
});
