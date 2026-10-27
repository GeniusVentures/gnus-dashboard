const { createMockProvider } = require("../../../lib/gnus/mock/provider");
const { createInjectedTransport } = require("../../../lib/gnus/transport/injected");

module.exports = {
  name: "mock",
  // Shape only: the dashboard keeps no copy of the SDK's processing-definition schema.
  exampleJob: { name: "contract-example", inputs: [], outputs: [], passes: [] },
  create(profile) {
    const win = new EventTarget();
    win.gnus = createMockProvider({ profile });
    return { transport: createInjectedTransport(win), controls: win.gnus.controls };
  },
};
