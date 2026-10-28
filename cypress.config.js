const fs = require("fs");
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
      });
    },
  },
});
