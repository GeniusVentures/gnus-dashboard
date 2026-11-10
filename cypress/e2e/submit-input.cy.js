import { installMock } from "../../lib/gnus/mock/install";

let mock;
const SMALL = { name: "tiny", inputs: [{ name: "a" }], outputs: [], passes: [{ id: 1 }] };

const visit = () => {
  cy.visit("/submit", {
    onBeforeLoad(win) {
      mock = installMock(win, { profile: "today" });
    },
  });
  cy.get("h1", { timeout: 12000 }).should("have.text", "Submit a job");
};
const jobField = () => cy.get("#job-json");
const type = (text) => jobField().clear().type(text, { parseSpecialCharSequences: false, delay: 0 });

describe("the three ways to give the page a job", () => {
  it("takes a chosen file, previews it, and sends exactly that object to the estimate", () => {
    visit();
    cy.get("#job-file").selectFile(
      { contents: Cypress.Buffer.from(JSON.stringify(SMALL)), fileName: "job.json", mimeType: "application/json" },
    );
    jobField().should("have.value", JSON.stringify(SMALL));
    cy.contains("h2", "What will be sent");
    cy.get("pre").should("contain.text", '"name": "tiny"');
    cy.contains("button", "Estimate cost").click();
    cy.contains("dd", "3 GNUS");
    cy.then(() => {
      const [call] = mock.controls.calls.filter((c) => c.method === "gnus_estimate");
      expect(call.params.job).to.deep.equal(SMALL);
    });
  });

  it("refuses a file over 5 MB and leaves Job JSON as it was", () => {
    visit();
    jobField().type("keep", { delay: 0 });
    cy.get("#job-file").selectFile({
      contents: Cypress.Buffer.alloc(5242881, 97),
      fileName: "big.json",
      mimeType: "application/json",
    });
    cy.get("[role=alert]").should("have.text", "This file is larger than 5 MB. GeniusWallet accepts jobs up to 5 MB.");
    jobField().should("have.value", "keep");
  });

  it("explains each kind of bad paste and keeps Estimate cost off", () => {
    visit();
    const cases = [
      ["{", "This is not valid JSON."],
      ["[]", "The job must be a JSON object."],
      [
        JSON.stringify({ inputs: [], outputs: [] }),
        "The job needs inputs, outputs and passes at the top level. Missing: passes.",
      ],
    ];
    for (const [text, message] of cases) {
      type(text);
      cy.get("[role=alert]").should("have.text", message);
      cy.contains("button", "Estimate cost").should("be.disabled");
      cy.contains("h2", "What will be sent").should("not.exist");
    }
  });

  it("loads the example, estimates it and shows 3 GNUS", () => {
    visit();
    cy.contains("button", "Estimate cost").should("be.disabled");
    cy.contains("button", "Load example").click();
    cy.contains("button", "Estimate cost").should("be.enabled").click();
    cy.contains("dd", "3 GNUS");
  });
});
