const init = jest.fn();
jest.mock("@walletconnect/sign-client", () => ({ __esModule: true, default: { init: (...args) => init(...args) } }));

const { createClient } = require("../../../lib/gnus/transport/walletconnect");

const fakeSdk = () => ({
  connect: jest.fn().mockResolvedValue({ uri: "wc:x", approval: jest.fn() }),
  request: jest.fn().mockResolvedValue({ ok: true }),
  ping: jest.fn(),
  disconnect: jest.fn(),
  session: { getAll: jest.fn().mockReturnValue([]) },
  on: jest.fn(),
  off: jest.fn(),
  core: { relayer: { transportClose: jest.fn().mockResolvedValue(undefined) } },
});

afterEach(() => {
  process.env.NEXT_PUBLIC_WC_PROJECT_ID = "";
});

describe("createClient", () => {
  test("without a project id it returns null and loads nothing", async () => {
    process.env.NEXT_PUBLIC_WC_PROJECT_ID = "";
    expect(await createClient()).toBeNull();
    expect(init).not.toHaveBeenCalled();
  });

  test("with an id it starts the client with this page's origin and no telemetry", async () => {
    process.env.NEXT_PUBLIC_WC_PROJECT_ID = "test-id";
    init.mockResolvedValue(fakeSdk());
    await createClient();
    const options = init.mock.calls[0][0];
    expect(options).toMatchObject({ projectId: "test-id", telemetryEnabled: false });
    expect(options.metadata.url).toBe(window.location.origin);
    expect(options.metadata.icons).toEqual([`${window.location.origin}/favicon.ico`]);
  });

  test("it proposes only the six gnus methods and three events on the Amoy chain, without a pairing topic", async () => {
    process.env.NEXT_PUBLIC_WC_PROJECT_ID = "test-id";
    const sdk = fakeSdk();
    init.mockResolvedValue(sdk);
    const client = await createClient();
    await client.connect();
    expect(sdk.connect).toHaveBeenCalledWith({
      optionalNamespaces: {
        eip155: {
          chains: ["eip155:80002"],
          methods: [
            "gnus_getAccounts",
            "gnus_estimate",
            "gnus_submitJob",
            "gnus_listJobs",
            "gnus_getJob",
            "gnus_getEarnings",
          ],
          events: ["gnus_accountsChanged", "gnus_networkChanged", "gnus_jobUpdated"],
        },
      },
    });
  });
});
