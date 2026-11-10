// Manual check of the WalletConnect screens on the dev server, which is the only place the fake relay exists.
//   NEXT_PUBLIC_GNUS_MOCK=1 yarn dev
//   yarn cy:run --config baseUrl=http://127.0.0.1:3000,specPattern=cypress/dev/relay-a11y.cy.js
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const SCHEMES = [
  { name: "light", background: "rgb(255, 255, 255)" },
  { name: "dark", background: "rgb(0, 0, 0)" },
];
const SLOW = { timeout: 30000 };

const emulate = (scheme) =>
  Cypress.automation("remote:debugger:protocol", {
    command: "Emulation.setEmulatedMedia",
    params: { features: [{ name: "prefers-color-scheme", value: scheme }] },
  });

function expectNoViolations() {
  cy.task("axeSource", null, { log: false }).then((source) => {
    cy.window({ log: false })
      .then((win) => {
        win.eval(source);
        return win.axe.run(win.document, { runOnly: { type: "tag", values: TAGS } });
      })
      .then(({ violations }) => {
        const report = violations.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
        expect(report, report.join("\n")).to.deep.equal([]);
      });
  });
}

const STATES = [
  ["pairing", "proposalExpires", () => cy.get("svg[aria-label='WalletConnect pairing code']", SLOW)],
  ["declined", "decline", () => cy.contains("h1", "GeniusWallet declined the connection.", SLOW)],
  ["not GeniusWallet", "notGenius", () => cy.contains("The wallet you connected is not GeniusWallet.", SLOW)],
  ["old GeniusWallet", "oldGenius", () => cy.contains("h1", "Update GeniusWallet", SLOW)],
  ["Wallet offline", "offline", () => cy.contains("h1", "Wallet offline", SLOW)],
  ["connected with Disconnect", "approve", () => cy.contains("button", "Disconnect", SLOW)],
  ["Disconnected", "walletEnds", () => cy.contains("h1", "Disconnected", SLOW)],
];

SCHEMES.forEach(({ name, background }) => {
  describe(`WalletConnect screens, ${name} scheme`, () => {
    STATES.forEach(([state, profile, reach]) => {
      it(`${state} has no WCAG 2.1 A or AA violations`, () => {
        cy.then(() => emulate(name));
        cy.visit(`/?gnusWc=${profile}`);
        reach();
        cy.get("body").should("have.css", "background-color", background);
        expectNoViolations();
      });
    });
  });
});
