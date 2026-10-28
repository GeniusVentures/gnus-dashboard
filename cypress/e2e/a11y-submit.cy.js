import { createMockProvider } from "../../lib/gnus/mock/provider";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const SCHEMES = [
  { name: "light", background: "rgb(255, 255, 255)" },
  { name: "dark", background: "rgb(0, 0, 0)" },
];

function emulate(scheme) {
  return Cypress.automation("remote:debugger:protocol", {
    command: "Emulation.setEmulatedMedia",
    params: { features: [{ name: "prefers-color-scheme", value: scheme }] },
  });
}

function expectNoViolations() {
  cy.task("axeSource", null, { log: false }).then((source) => {
    cy.window({ log: false })
      .then((win) => {
        win.eval(source);
        return win.axe.run(win.document, { runOnly: { type: "tag", values: TAGS } });
      })
      .then(({ violations }) => {
        const report = violations.map(
          (v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
        );
        expect(report, report.join("\n")).to.deep.equal([]);
      });
  });
}

// One mock per test; every load, including a reload, gets a fresh facade over the same state.
let mock;
function visit(profile, { holdEstimate = false, storageFull = false } = {}) {
  mock = createMockProvider({ profile });
  cy.on("window:before:load", (win) => {
    if (storageFull) {
      Object.defineProperty(win.Storage.prototype, "setItem", {
        value() {
          throw new Error("QuotaExceededError");
        },
        configurable: true,
      });
    }
    const facade = mock.controls.reinject();
    win.gnus = holdEstimate
      ? {
          isGeniusWallet: true,
          version: "1",
          request: (args) => (args.method === "gnus_estimate" ? new Promise(() => {}) : facade.request(args)),
          on: facade.on,
          removeListener: facade.removeListener,
        }
      : facade;
    win.dispatchEvent(new win.Event("gnus#initialized"));
  });
  cy.visit("/submit");
  cy.get("h1", { timeout: 12000 }).should("have.text", "Submit a job");
}

const load = () => cy.contains("button", "Load example").click();
const estimate = () => {
  load();
  cy.contains("button", "Estimate cost").click();
};
const ready = () => {
  estimate();
  cy.contains("dd", "3 GNUS");
};
const pay = () => cy.contains("button", "Pay and submit").click();
const paid = (profile) => {
  visit(profile);
  ready();
  pay();
};

const STATES = [
  ["empty form", () => visit("today")],
  ["invalid JSON", () => {
    visit("today");
    cy.get("#job-json").type("{", { parseSpecialCharSequences: false });
    cy.contains("[role=alert]", "This is not valid JSON.");
  }],
  ["estimated with the preview", () => {
    visit("today");
    ready();
    cy.contains("h2", "What will be sent");
  }],
  ["estimate loading", () => {
    visit("today", { holdEstimate: true });
    estimate();
    cy.contains("Asking GeniusWallet for the price...");
  }],
  ["Price unavailable", () => {
    visit("costUnavailable");
    estimate();
    cy.contains("[role=alert]", "Price unavailable");
  }],
  ["Not enough GNUS", () => {
    visit("insufficientBalance");
    estimate();
    cy.contains("[role=alert]", "Not enough GNUS");
  }],
  ["Gas not estimated with no paying wallet", () => {
    visit("allNulls");
    estimate();
    cy.contains("dd", "Gas not estimated");
    cy.contains("There is no paying wallet in GeniusWallet. Add one first.");
  }],
  ["stale estimate", () => {
    visit("today");
    ready();
    cy.get("#job-json").type(" ");
    cy.contains("The job changed. Estimate again before you submit.");
  }],
  ["the storage message", () => {
    visit("today", { storageFull: true });
    estimate();
    cy.contains("[role=alert]", "This browser couldn't save the submit");
  }],
  ["Confirm in your wallet with the Cancel note", () => {
    paid("manualConfirm");
    cy.contains("h2", "Confirm in your wallet");
    cy.contains("button", "Cancel").click();
    cy.contains("This page can't close GeniusWallet's confirm.");
  }],
  ["back at the job after a reject", () => {
    paid("rejectConfirm");
    cy.contains("[role=alert]", "Nothing was spent.");
  }],
  ["Job submitted", () => {
    paid("today");
    cy.contains("h2", "Job submitted");
  }],
  ["Paid but not processed", () => {
    paid("bridgedNotProcessedStatus");
    cy.contains("h2", "Paid but not processed");
  }],
  ["Payment not confirmed", () => {
    paid("unconfirmedSubmit");
    cy.contains("h2", "Payment not confirmed");
  }],
  ["Payment status unknown", () => {
    paid("submissionOutcomeUnknown");
    cy.contains("h2", "Payment status unknown");
  }],
  ["Waiting for GeniusWallet", () => {
    paid("walletStopsMidSubmit");
    cy.contains("h2", "Confirm in your wallet");
    cy.reload();
    cy.contains("h2", "Waiting for GeniusWallet", { timeout: 12000 });
  }],
  ["the no-record note", () => {
    paid("manualConfirm");
    cy.contains("h2", "Confirm in your wallet");
    cy.reload();
    cy.contains("GeniusWallet has no record of this submit.", { timeout: 12000 });
  }],
];

SCHEMES.forEach(({ name: scheme, background }) => {
  describe(`axe on the submit page, ${scheme} scheme`, () => {
    STATES.forEach(([state, reach]) => {
      it(`${state} has no WCAG 2.1 A or AA violations`, () => {
        cy.then(() => emulate(scheme));
        reach();
        cy.window({ log: false }).then((win) => {
          expect(win.matchMedia("(prefers-color-scheme: dark)").matches).to.eq(scheme === "dark");
        });
        cy.get("body").should("have.css", "background-color", background);
        expectNoViolations();
      });
    });
  });
});

describe("focus and announcements", () => {
  const OUTCOMES = [
    ["today", "Job submitted"],
    ["bridgedNotProcessedStatus", "Paid but not processed"],
    ["unconfirmedSubmit", "Payment not confirmed"],
    ["submissionOutcomeUnknown", "Payment status unknown"],
  ];

  OUTCOMES.forEach(([profile, heading]) => {
    it(`${heading} takes focus on its heading`, () => {
      paid(profile);
      cy.contains("h2", heading).should("have.focus");
    });
  });

  it("Paid but not processed is an alert that stays", () => {
    paid("bridgedNotProcessedStatus");
    cy.contains("h2", "Paid but not processed").closest("[role=alert]").should("exist");
    cy.wait(10000);
    cy.contains("h2", "Paid but not processed").closest("[role=alert]").should("be.visible");
  });

  it("the confirm region and the other outcomes are status regions", () => {
    paid("manualConfirm");
    cy.contains("h2", "Confirm in your wallet").closest("[role=status]").should("exist");
    cy.then(() => mock.controls.answerConfirm(true));
    cy.contains("h2", "Job submitted").closest("[role=status]").should("exist");
  });

  it("an input error and a submit error are alerts", () => {
    visit("rejectConfirm");
    cy.get("#job-json").type("[", { parseSpecialCharSequences: false });
    cy.contains("This is not valid JSON.").should("have.attr", "role", "alert");
    cy.get("#job-json").clear();
    ready();
    pay();
    cy.contains("You rejected this in GeniusWallet.").closest("[role=alert]").should("exist");
  });

  it("Waiting for GeniusWallet after a reload takes focus", () => {
    paid("walletStopsMidSubmit");
    cy.reload();
    cy.contains("h2", "Waiting for GeniusWallet", { timeout: 12000 }).should("have.focus");
  });
});
