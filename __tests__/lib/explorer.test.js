import { explorerTxUrl } from "../../lib/explorer";

const HASH = "0x" + "ab".repeat(32);

describe("explorerTxUrl", () => {
  it.each([
    [1, "https://etherscan.io/tx/"],
    [11155111, "https://sepolia.etherscan.io/tx/"],
    [137, "https://polygonscan.com/tx/"],
    [80002, "https://amoy.polygonscan.com/tx/"],
    [56, "https://bscscan.com/tx/"],
    [97, "https://testnet.bscscan.com/tx/"],
  ])("links chain %i", (chainId, prefix) => {
    expect(explorerTxUrl(chainId, HASH)).toBe(prefix + HASH);
  });

  it("gives no link for an unknown chain, a null chain or an inherited property name", () => {
    expect(explorerTxUrl(5, HASH)).toBeNull();
    expect(explorerTxUrl(null, HASH)).toBeNull();
    expect(explorerTxUrl("constructor", HASH)).toBeNull();
  });
});
