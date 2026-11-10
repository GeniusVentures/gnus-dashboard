import { installMock } from "../../lib/gnus/mock/install";

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

let mock;
let page;
const visit = (path, profile = "jobHistory") =>
  cy.visit(path, {
    onBeforeLoad(win) {
      page = win;
      mock = installMock(win, { profile });
    },
  });
const hashOf = (n) => `0x5eed${n.toString(16).padStart(60, "0")}`;
const resultHash = (n) => `0x7e57${n.toString(16).padStart(60, "0")}`;
const rows = (count) => cy.get("tbody tr", { timeout: 12000 }).should("have.length", count);

const STATES = [
  ["jobs list", () => { visit("/jobs"); rows(20); }],
  ["every status", () => { visit("/jobs", "jobResults"); rows(9); cy.contains("td", "Status unknown"); }],
  ["empty list", () => { visit("/jobs", "today"); cy.contains("h2", "No jobs yet", { timeout: 12000 }); }],
  ["list error", () => { visit("/jobs", "readsFail"); cy.contains("h2", "Couldn't load your jobs", { timeout: 12000 }); }],
  ["search with no match", () => {
    visit("/jobs");
    rows(20);
    cy.get("#job-search").type("zzzz");
    cy.contains("No loaded job matches.");
  }],
  ["detail with a result and links", () => {
    visit(`/jobs/detail?hash=${resultHash(4)}`, "jobResults");
    cy.contains("a", "Open in IPFS gateway", { timeout: 12000 });
  }],
  ["detail with a null result", () => {
    visit(`/jobs/detail?hash=${hashOf(3)}`);
    cy.contains("Result not available yet", { timeout: 12000 });
  }],
  ["detail error", () => {
    visit(`/jobs/detail?hash=${hashOf(3)}`, "readsFail");
    cy.contains("h2", "Couldn't load this job", { timeout: 12000 });
  }],
  ["no job found", () => {
    visit(`/jobs/detail?hash=0x${"9".repeat(64)}`);
    cy.contains("h2", "No job found", { timeout: 12000 });
  }],
  ["a link that names no job", () => {
    visit("/jobs/detail");
    cy.contains("This link doesn't name a job.", { timeout: 12000 });
  }],
  ["earnings, today", () => { visit("/earnings", "today"); cy.contains("dd", "12 GNUS", { timeout: 12000 }); }],
  ["earnings, populated with history", () => {
    visit("/earnings", "populated");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 1);
  }],
  ["earnings error", () => { visit("/earnings", "readsFail"); cy.contains("h2", "Couldn't load your earnings", { timeout: 12000 }); }],
];

SCHEMES.forEach(({ name: scheme, background }) => {
  describe(`axe on jobs and earnings, ${scheme} scheme`, () => {
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

describe("keyboard on jobs and earnings", () => {
  const TAB = () => cy.press(Cypress.Keyboard.Keys.TAB);

  function tabUntil(isTarget, left = 60) {
    TAB();
    cy.focused().then(($el) => {
      if (isTarget($el)) {
        return;
      }
      expect(left, "tab presses left").to.be.greaterThan(0);
      tabUntil(isTarget, left - 1);
    });
  }

  const key = (type) =>
    Cypress.automation("remote:debugger:protocol", {
      command: "Input.dispatchKeyEvent",
      params: {
        type,
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
        ...(type === "keyDown" ? { text: "\r" } : {}),
      },
    });
  const enter = () => {
    cy.window({ log: false }).then((win) => win.focus());
    ["keyDown", "keyUp"].forEach((type) => cy.then(() => key(type)));
  };

  beforeEach(() => {
    cy.then(() => emulate("light"));
    cy.viewport(1300, 800);
  });

  it("reaches the search field, finds a job that is not loaded, and opens it with Enter", () => {
    visit("/jobs");
    rows(20);
    tabUntil(($el) => $el.attr("id") === "job-search");
    cy.focused().type(`${hashOf(2)}{enter}`);
    cy.url().should("include", `/jobs/detail?hash=${hashOf(2)}`);
    cy.contains("dd", "seed-2");
  });

  it("reaches Load more jobs with a focus ring, loads page 2, lands on its first new row and opens it", () => {
    visit("/jobs");
    rows(20);
    tabUntil(($el) => $el.text() === "Load more jobs");
    cy.focused().should(($el) => {
      expect($el[0].matches(":focus-visible"), "focus-visible").to.eq(true);
      const style = page.getComputedStyle($el[0]);
      expect(style.outlineStyle).to.not.eq("none");
      expect(parseFloat(style.outlineWidth)).to.be.at.least(2);
    });
    enter();
    rows(25);
    cy.focused().should("have.attr", "href", `/jobs/detail?hash=${hashOf(5)}`);
    enter();
    cy.url().should("include", `/jobs/detail?hash=${hashOf(5)}`);
    cy.contains("dd", "seed-5");
  });

  it("reaches Refresh on Earnings and Enter reads once more", () => {
    visit("/earnings", "today");
    cy.contains("Last updated", { timeout: 12000 });
    tabUntil(($el) => $el.text() === "Refresh");
    const reads = () => mock.controls.calls.filter((c) => c.method === "gnus_getEarnings").length;
    cy.then(() => expect(reads()).to.eq(1));
    enter();
    cy.wrap(null).should(() => expect(reads()).to.eq(2));
  });
});
