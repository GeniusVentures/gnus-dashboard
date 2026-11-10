import { createMockProvider } from "../../lib/gnus/mock/provider";

let mock;

// One mock per test, a fresh facade per load; wrapFirst changes only the first page's facade.
const visit = (profile, wrapFirst) => {
  mock = createMockProvider({ profile });
  let loads = 0;
  cy.on("window:before:load", (win) => {
    const facade = mock.controls.reinject();
    win.gnus = loads === 0 && wrapFirst ? wrapFirst(facade) : facade;
    loads += 1;
    win.dispatchEvent(new win.Event("gnus#initialized"));
  });
  cy.visit("/submit");
};
const fill = () => {
  cy.contains("button", "Load example", { timeout: 12000 }).click();
  cy.contains("button", "Estimate cost").click();
  cy.contains("dd", "3 GNUS");
};
const pay = () => cy.contains("button", "Pay and submit").click();
const entries = () =>
  cy.window().then((win) => Object.keys(win.localStorage).filter((name) => name.startsWith("gnus.submit.")));
const burns = (n) => cy.then(() => expect(mock.controls.burnCount()).to.eq(n));
const submits = (n) =>
  cy.then(() => expect(mock.controls.calls.filter((c) => c.method === "gnus_submitJob")).to.have.length(n));

describe("a payment whose fate is open keeps its key", () => {
  it("a failed check, a reload and no record: the same job keeps its key and pays once", () => {
    visit("manualConfirm", (facade) => {
      const request = facade.request;
      facade.request = (args) => {
        if (args.method === "gnus_submitJob") {
          request(args).catch(() => {});
          return Promise.reject({ code: -32603, message: "Internal error" });
        }
        if (args.method === "gnus_getJob") {
          return Promise.reject({ code: -32005, message: "Too many requests", data: { reason: "rate_limited" } });
        }
        return request(args);
      };
      return facade;
    });
    fill();
    pay();
    cy.contains("h2", "Couldn't check this payment");
    entries().then((before) => {
      expect(before).to.have.length(1);
      cy.reload();
      cy.contains("GeniusWallet has no record of this submit.", { timeout: 12000 });
      fill();
      entries().should("deep.equal", before);
      cy.then(() => mock.controls.answerConfirm(true));
      pay();
      cy.contains("h2", "Job submitted");
      entries().should("deep.equal", before);
      burns(1);
      cy.then(() => expect(mock.controls.confirmCount()).to.eq(1));
    });
  });

  it("Submit another job on a payment still waiting keeps its key; the same job is looked up, not paid again", () => {
    visit("walletStopsMidSubmit");
    fill();
    pay();
    cy.contains("h2", "Confirm in your wallet");
    burns(1);
    cy.reload();
    cy.contains("h2", "Waiting for GeniusWallet", { timeout: 12000 });
    entries().then((before) => {
      cy.contains("button", "Submit another job").click();
      entries().should("deep.equal", before);
      fill();
      pay();
      cy.contains("h2", "Waiting for GeniusWallet");
      entries().should("deep.equal", before);
      submits(1);
      burns(1);
    });
  });
});

describe("a disconnect during the payment", () => {
  it("is named over the wallet gate, never says nothing was spent, and reconnecting shows the payment", () => {
    visit("today", (facade) => {
      const request = facade.request;
      facade.request = async (args) => {
        if (args.method !== "gnus_submitJob") {
          return request(args);
        }
        await request(args);
        mock.controls.revokeOrigin();
        throw { code: 4100, message: "The origin was revoked" };
      };
      return facade;
    });
    fill();
    pay();
    cy.contains("[role=alert]", "This site was disconnected during the payment. Reconnect to see what happened.");
    cy.contains("h1", "Allow this site in GeniusWallet");
    cy.contains("Nothing was spent").should("not.exist");
    cy.contains("button", "Connect again").click();
    cy.wrap(null).should(() => mock.controls.answerConnect(true));
    cy.contains("h2", "Job submitted", { timeout: 12000 });
    cy.contains("This site was disconnected during the payment.").should("not.exist");
    burns(1);
    submits(1);
  });
});

describe("a spent payment stays on screen", () => {
  it("a newer estimate that was never paid does not hide an older payment after a reload", () => {
    visit("manualConfirm");
    fill();
    pay();
    cy.contains("h2", "Confirm in your wallet");
    cy.reload();
    cy.contains("GeniusWallet has no record of this submit.", { timeout: 12000 });
    cy.then(() => mock.controls.answerConfirm(true));
    cy.get("#job-json").type('{"name":"other","inputs":[],"outputs":[],"passes":[]}', {
      parseSpecialCharSequences: false,
    });
    cy.contains("button", "Estimate cost").click();
    cy.contains("dd", "3 GNUS");
    cy.reload();
    cy.contains("h2", "Job submitted", { timeout: 12000 });
    cy.contains("0x0000...0001");
    burns(1);
  });

  it("a new paying wallet keeps Paid but not processed and its burn hash", () => {
    visit("bridgedNotProcessedStatus");
    fill();
    pay();
    cy.contains("h2", "Paid but not processed");
    cy.then(() => mock.request({ method: "gnus_getAccounts" })).then((accounts) => {
      mock.controls.emit("gnus_accountsChanged", {
        ...accounts,
        payer: { ...accounts.payer, evmAddress: "0x" + "b2".repeat(20) },
      });
    });
    cy.contains("0xb2b2");
    cy.contains("h2", "Paid but not processed");
    cy.contains("0x0000...0001");
    cy.contains("a", "View the payment on the block explorer");
  });
});
