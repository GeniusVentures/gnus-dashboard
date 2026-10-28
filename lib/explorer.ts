const TX_PREFIX: Record<number, string> = {
  1: "https://etherscan.io/tx/",
  11155111: "https://sepolia.etherscan.io/tx/",
  137: "https://polygonscan.com/tx/",
  80002: "https://amoy.polygonscan.com/tx/",
  56: "https://bscscan.com/tx/",
  97: "https://testnet.bscscan.com/tx/",
};

/** The chains GeniusWallet links to for a transaction; any other chain gets no link. */
export function explorerTxUrl(chainId: number | null, txHash: string): string | null {
  return chainId !== null && Object.hasOwn(TX_PREFIX, chainId) ? TX_PREFIX[chainId] + txHash : null;
}
