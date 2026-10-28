const { createFakeRelay } = require("../../../lib/gnus/mock/relay");
const { createWalletConnectTransport } = require("../../../lib/gnus/transport/walletconnect");

module.exports = {
  name: "walletconnect-mock",
  // The mock wallet is behind it, so cases that spend run.
  mockBacked: true,
  // Shape only: the dashboard keeps no copy of the SDK's processing-definition schema.
  exampleJob: { name: "contract-example", inputs: [], outputs: [], passes: [] },
  create(profile) {
    const relay = createFakeRelay({ mockProfile: profile });
    void relay.connect();
    relay.controls.approvePending();
    const [session] = relay.getSessions();
    const mock = relay.provider.controls;
    return {
      transport: createWalletConnectTransport(relay, session),
      // Over WalletConnect the end of a connection is the end of the session, not a disconnect event from the wallet.
      controls: {
        ...mock,
        disconnect: (code = 4900, message = "Wallet disconnected") => relay.controls.endFromWallet({ code, message }),
      },
    };
  },
};
