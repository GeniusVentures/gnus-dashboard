import { createMockProvider } from "../../lib/gnus/mock/provider";

let mock;

// One mock for the whole test; every load, including a reload, gets a fresh facade over the same state, as the wallet keeps its records.
const visit = (profile) => {
  mock = createMockProvider({ profile });
  cy.on("window:before:load", (win) => {
    win.gnus = mock.controls.reinject();
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
const reload = () => cy.reload();

describe("reload at every step ends on the truth with one burn", () => {
  it("at review: the form is empty, the same job gets the same key, one burn", () => {
    visit("today");
    fill();
    entries().then((before) => {
      expect(before).to.have.length(1);
      reload();
      cy.get("#job-json", { timeout: 12000 }).should("have.value", "");
      fill();
      entries().should("deep.equal", before);
      pay();
      cy.contains("h2", "Job submitted");
      entries().should("deep.equal", before);
      burns(1);
    });
  });

  it("during the confirm: no record yet, a second submit is in flight, one confirm, one burn", () => {
    visit("manualConfirm");
    fill();
    pay();
    cy.contains("h2", "Confirm in your wallet");
    reload();
    cy.contains("GeniusWallet has no record of this submit.", { timeout: 12000 });
    fill();
    pay();
    cy.contains("[role=alert]", "A submit from this page is already in progress.");
    cy.then(() => {
      expect(mock.controls.confirmCount()).to.eq(1);
      mock.controls.answerConfirm(true);
    });
    pay();
    cy.contains("h2", "Job submitted");
    cy.contains("0x0000...0001");
    entries().should("have.length", 1);
    burns(1);
  });

  it("after a lost response: the real outcome shows with no click", () => {
    visit("manualConfirm");
    fill();
    pay();
    cy.contains("h2", "Confirm in your wallet");
    reload();
    cy.contains("GeniusWallet has no record of this submit.", { timeout: 12000 });
    cy.then(() => mock.controls.answerConfirm(true));
    reload();
    cy.contains("h2", "Job submitted", { timeout: 12000 });
    entries().should("have.length", 1);
    burns(1);
  });

  it("on a result screen: it comes back, and Submit another job leaves an empty form", () => {
    visit("today");
    fill();
    pay();
    cy.contains("h2", "Job submitted");
    reload();
    cy.contains("h2", "Job submitted", { timeout: 12000 });
    cy.contains("0x0000...0001");
    entries().should("have.length", 1);
    burns(1);
    cy.contains("button", "Submit another job").click();
    entries().should("have.length", 0);
    reload();
    cy.get("#job-json", { timeout: 12000 }).should("have.value", "");
    entries().should("have.length", 0);
    burns(1);
  });

  it("walletStopsMidSubmit: Waiting for GeniusWallet with the hash, and Check again asks once", () => {
    visit("walletStopsMidSubmit");
    fill();
    pay();
    cy.contains("h2", "Confirm in your wallet");
    burns(1);
    reload();
    cy.contains("h2", "Waiting for GeniusWallet", { timeout: 12000 });
    cy.contains("0x0000...0001");
    cy.then(() => {
      cy.wrap(mock.controls.calls.filter((c) => c.method === "gnus_getJob").length).as("before");
    });
    cy.contains("button", "Check again").click();
    cy.contains("h2", "Waiting for GeniusWallet");
    cy.get("@before").then((before) => {
      expect(mock.controls.calls.filter((c) => c.method === "gnus_getJob")).to.have.length(before + 1);
    });
    entries().should("have.length", 1);
    burns(1);
  });
});
