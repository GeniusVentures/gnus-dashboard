import React from "react";
import AddressChip from "./AddressChip";
import { useSession } from "./SessionProvider";

// Chain ids the dashboard actually targets; anything else keeps its numeric id.
const CHAIN_NAMES: Record<string, string> = {
  "80002": "Amoy testnet",
  "11155111": "Sepolia testnet",
  "137": "Polygon",
  "1": "Ethereum",
};

const chainName = (chainId: number | null): string =>
  chainId === null ? "unknown" : CHAIN_NAMES[String(chainId)] ?? `chain ${chainId}`;

const IdentityHeader: React.FC = () => {
  const { state, store } = useSession();
  const accounts = state.phase === "ready" || state.phase === "switching" ? state.accounts : null;
  if (!accounts) {
    return <span className="badge text-bg-light border">Not connected</span>;
  }
  const { sdk, evmChainId } = accounts.network;
  const payer = accounts.payer.evmAddress;
  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      <AddressChip label="Earning as" address={accounts.node.sdkAddress} copyName="Copy earning address" />
      {payer ? (
        <AddressChip label="Paying from" address={payer} copyName="Copy paying address" />
      ) : (
        <span className="badge text-bg-warning">No paying wallet</span>
      )}
      <span className="chain-name badge text-bg-light border" title={sdk ?? undefined}>
        {chainName(evmChainId)}
      </span>
      {state.transport === "walletconnect" ? (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => store?.disconnect()}>
          Disconnect
        </button>
      ) : null}
    </div>
  );
};

export default IdentityHeader;
