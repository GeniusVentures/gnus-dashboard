import { installMock } from "../../lib/gnus/mock/install";

let mock;
const HASH = `0x${"0".repeat(63)}1`;

const run = (profile) => {
  cy.visit("/submit", {
    onBeforeLoad(win) {
      mock = installMock(win, { profile });
    },
  });
  cy.contains("button", "Load example", { timeout: 12000 }).click();
  cy.contains("button", "Estimate cost").click();
  cy.contains("dd", "3 GNUS");
  cy.contains("button", "Pay and submit").click();
};
const burns = (n) => cy.then(() => expect(mock.controls.burnCount()).to.eq(n));

describe("nothing spent: back at the job", () => {
  it("rejectConfirm", () => {
    run("rejectConfirm");
    cy.contains("[role=alert]", "You rejected this in GeniusWallet.");
    cy.contains("[role=alert]", "Nothing was spent.");
    cy.get("#job-json").invoke("val").should("contain", "posenet-inference");
    cy.contains("button", "Pay and submit").should("be.enabled");
    burns(0);
  });

  it("confirmOpen", () => {
    run("confirmOpen");
    cy.contains("[role=alert]", "A confirm is already open in GeniusWallet. Finish it there first.");
    cy.contains("Nothing was spent.").should("not.exist");
    cy.then(() => {
      expect(mock.controls.calls.filter((c) => c.method === "gnus_submitJob")).to.have.length(1);
    });
  });

  it("bridgeFailed says nothing was spent once", () => {
    run("bridgeFailed");
    cy.contains("[role=alert]", "The payment did not go through. Nothing was spent.");
    cy.get("[role=alert]").invoke("text").then((text) => expect(text.match(/Nothing was spent/g)).to.have.length(1));
    burns(0);
  });
});

describe("paid, or not sure", () => {
  ["bridgedNotProcessedStatus", "bridgedNotProcessedError"].forEach((profile) => {
    it(`${profile} is a banner that stays, with the hash and no retry`, () => {
      run(profile);
      cy.contains("h2", "Paid but not processed").should("have.focus");
      cy.contains("h2", "Paid but not processed")
        .closest("section")
        .should("contain", "0x0000...0001")
        .and("contain", "Submitting this job again would pay again.");
      cy.contains("a", "View the payment on the block explorer").should(
        "have.attr",
        "href",
        `https://amoy.polygonscan.com/tx/${HASH}`,
      );
      cy.contains("button", /retry|try again/i).should("not.exist");
      cy.contains("button", "Pay and submit").should("not.exist");
      burns(1);
    });
  });

  it("unconfirmedSubmit", () => {
    run("unconfirmedSubmit");
    cy.contains("h2", "Payment not confirmed").should("have.focus");
    cy.contains("a", "View this job");
    burns(1);
  });

  it("submissionOutcomeUnknown", () => {
    run("submissionOutcomeUnknown");
    cy.contains("h2", "Payment status unknown").should("have.focus");
    cy.contains("GeniusWallet can't tell whether this payment went through.");
    cy.contains("dd", "3 GNUS");
    cy.contains("a", "View this job").should("not.exist");
    burns(0);
  });

  it("populated shows the job id", () => {
    run("populated");
    cy.contains("h2", "Job submitted");
    cy.contains("Job id: job-1");
    burns(1);
  });
});

describe("a confirm that stays open", () => {
  it("shows Confirm in your wallet and the Cancel note, then Job submitted when answered", () => {
    run("manualConfirm");
    cy.contains("h2", "Confirm in your wallet");
    cy.contains("button", "Cancel").click();
    cy.contains("This page can't close GeniusWallet's confirm.");
    cy.contains("h2", "Confirm in your wallet");
    cy.then(() => {
      expect(mock.controls.confirmCount()).to.eq(1);
      mock.controls.answerConfirm(true);
    });
    cy.contains("h2", "Job submitted");
    burns(1);
  });

  it("revoking the origin moves the page to Allow this site, with nothing burned", () => {
    run("manualConfirm");
    cy.contains("h2", "Confirm in your wallet");
    cy.then(() => mock.controls.revokeOrigin());
    cy.get("h1").should("have.text", "Allow this site in GeniusWallet");
    burns(0);
  });
});
