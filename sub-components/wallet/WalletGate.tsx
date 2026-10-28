import React from "react";
import ExternalLink from "../shared/ExternalLink";
import { Phase } from "../../lib/session/machine";
import { useSession } from "./SessionProvider";

const SITE = "https://gnus.ai/";

interface Screen {
  heading: string;
  body: string;
  spinner?: boolean;
}

const SCREENS: Partial<Record<Phase, Screen>> = {
  detecting: { heading: "Looking for GeniusWallet", body: "This takes a few seconds.", spinner: true },
  connecting: {
    heading: "Confirm in your wallet",
    body: "GeniusWallet is asking whether this site may connect. Approve it there to continue.",
    spinner: true,
  },
  noWallet: {
    heading: "GeniusWallet required",
    body: "This dashboard pays for jobs and shows your earnings through GeniusWallet. Open this page from GeniusWallet.",
  },
};

const WalletGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, store } = useSession();
  if (state.phase === "ready") {
    return <>{children}</>;
  }
  const screen: Screen | undefined =
    state.phase === "failed" && state.error
      ? { heading: "GeniusWallet couldn't connect", body: state.error.message }
      : SCREENS[state.phase];
  if (!screen) {
    return null;
  }
  return (
    <section className="text-center py-5 container" role="status">
      <h1 className="display-6">{screen.heading}</h1>
      <p className="fs-5">
        {screen.spinner ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> : null}
        {screen.body}
      </p>
      {state.phase === "noWallet" ? <ExternalLink href={SITE}>Get GeniusWallet</ExternalLink> : null}
      {state.phase === "failed" ? (
        <button type="button" className="btn btn-primary" onClick={() => store?.retry()}>
          Retry
        </button>
      ) : null}
    </section>
  );
};

export default WalletGate;
