const fs = require("fs");
const path = require("path");
const { defineConfig } = require("cypress");

module.exports = defineConfig({
  video: false,
  e2e: {
    baseUrl: "http://127.0.0.1:4173",
    supportFile: false,
    specPattern: "cypress/e2e/**/*.cy.js",
    setupNodeEvents(on) {
      // axe-core comes in through jest-axe; the spec injects this text into the page under test only.
      on("task", {
        axeSource: () => fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8"),
        // The Content-Security-Policy header the export must be served with, from the module that also writes out/_headers.
        expectedCsp() {
          const { CSP_ENFORCED, cspName, policy } = require("./scripts/headers");
          return { name: cspName(CSP_ENFORCED), value: policy };
        },
        // The two chunks that make the browser path: the WalletConnect module, and Reown's client with the relay address.
        walletConnectChunks() {
          const dir = path.join(__dirname, "out", "_next", "static", "chunks");
          const holding = (text) => {
            const found = fs.readdirSync(dir).filter((f) => f.endsWith(".js") && fs.readFileSync(path.join(dir, f), "utf8").includes(text));
            if (found.length !== 1) {
              throw new Error(`expected one chunk holding ${text}, found ${found.length}`);
            }
            return found[0];
          };
          return { module: holding("eip155:80002"), relay: holding("relay.walletconnect.org") };
        },
      });
    },
  },
});
