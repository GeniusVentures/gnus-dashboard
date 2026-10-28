import React from "react";
import { useSession } from "./SessionProvider";

// 0x + the first 4 and last 4 hex digits.
const shorten = (address: string): string => `${address.slice(0, 6)}...${address.slice(-4)}`;

const IdentityHeader: React.FC = () => {
  const { state } = useSession();
  const accounts = state.phase === "ready" || state.phase === "switching" ? state.accounts : null;
  if (!accounts) {
    return (
      <div className="container py-2">
        <span>Not connected</span>
      </div>
    );
  }
  const { sdk, evmChainId } = accounts.network;
  return (
    <div className="container py-2 d-flex flex-wrap gap-4">
      <span>
        Earning as <code>{shorten(accounts.node.sdkAddress)}</code>
      </span>
      <span>
        Paying from{" "}
        {accounts.payer.evmAddress ? <code>{shorten(accounts.payer.evmAddress)}</code> : "No paying wallet"}
      </span>
      <span>
        Network: {sdk ?? "not set"}, chain {evmChainId ?? "not set"}
      </span>
    </div>
  );
};

export default IdentityHeader;
