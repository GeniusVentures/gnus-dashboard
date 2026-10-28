import React from "react";
import AddressChip from "./AddressChip";
import { useSession } from "./SessionProvider";

const IdentityHeader: React.FC = () => {
  const { state } = useSession();
  const accounts = state.phase === "ready" || state.phase === "switching" ? state.accounts : null;
  if (!accounts) {
    return <span>Not connected</span>;
  }
  const { sdk, evmChainId } = accounts.network;
  const payer = accounts.payer.evmAddress;
  return (
    <div className="d-flex flex-wrap align-items-center gap-3">
      <AddressChip label="Earning as" address={accounts.node.sdkAddress} copyName="Copy earning address" />
      {payer ? (
        <AddressChip label="Paying from" address={payer} copyName="Copy paying address" />
      ) : (
        <span>Paying from No paying wallet</span>
      )}
      <span>
        Network: {sdk ?? "not set"}, chain {evmChainId ?? "not set"}
      </span>
    </div>
  );
};

export default IdentityHeader;
