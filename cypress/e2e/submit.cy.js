import { installMock } from "../../lib/gnus/mock/install";

let mock;
const visit = (profile = "today") =>
  cy.visit("/submit", {
    onBeforeLoad(win) {
      mock = installMock(win, { profile });
    },
  });

describe("submit the bundled example on the mock", () => {
  it("loads the example, estimates, pays and shows the job submitted", () => {
    visit();
    cy.get("h1", { timeout: 12000 }).should("have.text", "Submit a job");
    cy.contains("button", "Load example").click();
    cy.get("#job-json").invoke("val").should("contain", "posenet-inference");
    cy.contains("button", "Estimate cost").click();
    cy.contains("dd", "3 GNUS");
    cy.contains("dd", "50 GNUS");
    cy.contains("dd", "30.5 gwei (POL)");
    cy.contains("button", "Pay and submit").click();
    cy.contains("h2", "Job submitted").should("have.focus");
    cy.contains("Job id: Job id pending");
    cy.contains("0x0000...0001");
    cy.contains("a", "View the payment on the block explorer")
      .should("have.attr", "href", `https://amoy.polygonscan.com/tx/0x${"0".repeat(63)}1`)
      .and("have.attr", "target", "_blank");
    cy.contains("a", "View this job").should("have.attr", "href", `/jobs/detail?hash=0x${"0".repeat(63)}1`);
    cy.then(() => {
      expect(mock.controls.burnCount()).to.eq(1);
      const sent = mock.controls.calls.filter((call) => call.method === "gnus_submitJob");
      expect(sent).to.have.length(1);
      return cy.window().then((win) => {
        const keys = Object.keys(win.localStorage).filter((name) => name.startsWith("gnus.submit."));
        expect(keys).to.have.length(1);
        const draft = JSON.parse(win.localStorage.getItem(keys[0]));
        expect(draft.idempotencyKey).to.eq(sent[0].params.idempotencyKey);
        expect(draft.sentAt).to.be.a("number");
        expect(draft.chainId).to.eq(80002);
        expect(draft.jobHash).to.match(/^[0-9a-f]{64}$/);
        expect(win.localStorage.getItem(keys[0]).length).to.be.lessThan(600);
      });
    });
  });

  it("clears the form for Submit another job", () => {
    visit();
    cy.contains("button", "Load example", { timeout: 12000 }).click();
    cy.contains("button", "Estimate cost").click();
    cy.contains("button", "Pay and submit").click();
    cy.contains("h2", "Job submitted");
    cy.contains("button", "Submit another job").click();
    cy.get("#job-json").should("have.value", "");
  });
});
