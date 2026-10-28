import { installMock } from "../../lib/gnus/mock/install";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const SCHEMES = [
  { name: "light", background: "rgb(255, 255, 255)" },
  { name: "dark", background: "rgb(0, 0, 0)" },
];

const FIRST = "0xa1a1...a1a1";

function emulate(scheme) {
  return Cypress.automation("remote:debugger:protocol", {
    command: "Emulation.setEmulatedMedia",
    params: { features: [{ name: "prefers-color-scheme", value: scheme }] },
  });
}

function expectNoViolations() {
  cy.task("axeSource", null, { log: false }).then((source) => {
    cy.window({ log: false }).then((win) => {
      win.eval(source);
      return win.axe.run(win.document, { runOnly: { type: "tag", values: TAGS } });
    }).then(({ violations }) => {
      const report = violations.map(
        (v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
      );
      expect(report, report.join("\n")).to.deep.equal([]);
    });
  });
}

// Each state visits with the mock and returns the controls once its own words are on screen.
let mock;
let page;
const visit = (profile, extra = {}) =>
  cy.visit("/", {
    onBeforeLoad(win) {
      page = win;
      mock = installMock(win, { profile, ...extra });
    },
  });
const header = () => cy.contains("Earning as", { timeout: 12000 }).should("contain", FIRST);

const STATES = [
  ["ready home page", () => { visit("today"); header(); cy.get("h1").should("have.text", "Dashboard"); }],
  ["connecting", () => { visit("connectPrompt"); cy.get("h1").should("have.text", "Confirm in your wallet"); }],
  ["denied", () => {
    visit("connectPrompt");
    cy.get("h1").should("have.text", "Confirm in your wallet");
    cy.then(() => mock.controls.answerConnect(false));
    cy.get("h1").should("have.text", "Allow this site in GeniusWallet");
  }],
  ["starting up", () => { visit("sdkStarting"); cy.get("h1").should("have.text", "GeniusWallet is starting up"); }],
  ["update GeniusWallet", () => { visit("malformedSwappedAddress"); cy.get("h1").should("have.text", "Update GeniusWallet"); }],
  ["GeniusWallet required", () => {
    cy.visit("/");
    cy.get("h1", { timeout: 6000 }).should("have.text", "GeniusWallet required");
  }],
  ["not responding", () => {
    visit("today");
    header();
    cy.then(() => mock.controls.disconnect());
    cy.get("h1").should("have.text", "GeniusWallet isn't responding");
  }],
  ["failed", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.gnus = {
          isGeniusWallet: true,
          request: () => Promise.reject({ code: -32603, message: "internal" }),
          on() {},
          removeListener() {},
        };
        win.dispatchEvent(new win.Event("gnus#initialized"));
      },
    });
    cy.get("h1").should("have.text", "GeniusWallet couldn't connect");
  }],
  ["switching banner", () => { visit("switching"); cy.contains("Switching account"); }],
  ["wrong network banner", () => {
    visit("today");
    header();
    cy.then(() => mock.controls.setNetwork({ sdk: "mainnet", evmChainId: 1 }));
    cy.contains("Wrong network");
  }],
  ["copy failed field", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        page = win;
        mock = installMock(win, { profile: "today" });
        Object.defineProperty(win.navigator, "clipboard", { value: undefined, configurable: true });
        win.document.execCommand = () => false;
      },
    });
    header();
    cy.get("button[aria-label='Copy earning address']").click();
    cy.contains("Copy failed. Select the address to copy it.");
  }],
  ["404 page", () => {
    cy.visit("/no-such-page", { failOnStatusCode: false });
    cy.get("h1").should("have.text", "Page not found");
  }],
];

SCHEMES.forEach(({ name: scheme, background }) => {
  describe(`axe, ${scheme} scheme`, () => {
    STATES.forEach(([state, reach]) => {
      it(`${state} has no WCAG 2.1 A or AA violations`, () => {
        cy.wrap(emulate(scheme), { log: false });
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
