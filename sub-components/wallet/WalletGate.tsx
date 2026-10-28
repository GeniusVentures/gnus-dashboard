import React from "react";
import ExternalLink from "../shared/ExternalLink";
import { GnusContractMismatchError } from "../../lib/gnus/errors";
import { CONTRACT_VERSION } from "../../lib/gnus/schema";
import { SessionState, networkMismatch, servedSdkNetwork } from "../../lib/session/machine";
import { SessionStore } from "../../lib/session/store";
import PairPanel from "./PairPanel";
import { useSession } from "./SessionProvider";

const SITE = "https://gnus.ai/";

type Action = "connectAgain" | "tryNow" | "retry" | "reload";

interface Screen {
  heading: string;
  body: string;
  spinner?: boolean;
  action?: { label: string; run: Action };
  link?: { label: string; href: string };
}

// The one place the state-screen words live.
function screenFor(state: SessionState): Screen | null {
  const { error } = state;
  switch (state.phase) {
    case "detecting":
      return { heading: "Looking for GeniusWallet", body: "This takes a few seconds.", spinner: true };
    case "connecting":
      return {
        heading: "Confirm in your wallet",
        body: "GeniusWallet is asking whether this site may connect. Approve it there to continue.",
        spinner: true,
      };
    case "startingUp":
      return {
        heading: "GeniusWallet is starting up",
        body: "This page connects as soon as GeniusWallet is ready.",
        spinner: true,
        action: { label: "Try now", run: "tryNow" },
      };
    case "notResponding": {
      const heading = "GeniusWallet isn't responding";
      if (state.cause === "noBridge") {
        return {
          heading,
          body: "GeniusWallet opened this page but has not connected to it yet.",
          action: { label: "Reload page", run: "reload" },
        };
      }
      return {
        heading,
        body:
          state.cause === "disconnected"
            ? "GeniusWallet closed its connection to this page."
            : "GeniusWallet hasn't answered for 15 seconds. If it is asking you to allow this site, approve it there.",
        action: { label: "Retry", run: "retry" },
      };
    }
    case "denied":
      return {
        heading: "Allow this site in GeniusWallet",
        body:
          state.cause === "notAllowed"
            ? "GeniusWallet hasn't allowed this site."
            : "You declined the connection. This site needs it to show your account and submit jobs.",
        action: { label: "Connect again", run: "connectAgain" },
      };
    case "unsupported":
      if (state.cause === "pageOld") {
        const version = error instanceof GnusContractMismatchError ? error.version : null;
        return {
          heading: "This page needs an update",
          body: `Your GeniusWallet uses contract version ${version ?? "unknown"}; this page supports version ${CONTRACT_VERSION}. Try again later.`,
        };
      }
      return {
        heading: "Update GeniusWallet",
        body:
          error instanceof GnusContractMismatchError
            ? error.message
            : "This GeniusWallet does not support this page. Update it, then open the page again.",
        action: state.transport === "walletconnect" ? { label: "Connect again", run: "connectAgain" } : undefined,
        link: { label: "Get the latest GeniusWallet", href: SITE },
      };
    case "noWallet":
      if (state.cause === "notGenius") {
        return {
          heading: "GeniusWallet required",
          body: "The wallet you connected is not GeniusWallet. Connect GeniusWallet instead.",
          action: { label: "Connect again", run: "connectAgain" },
          link: { label: "Get GeniusWallet", href: SITE },
        };
      }
      return {
        heading: "GeniusWallet required",
        body: "This dashboard pays for jobs and shows your earnings through GeniusWallet. Open this page from GeniusWallet.",
        link: { label: "Get GeniusWallet", href: SITE },
      };
    case "failed":
      return {
        heading: "GeniusWallet couldn't connect",
        body: error?.message ?? "GeniusWallet returned an unexpected error.",
        action: { label: "Retry", run: "retry" },
      };
    default:
      return null;
  }
}

const RUN: Record<Action, (store: SessionStore) => void> = {
  reload: () => window.location.reload(),
  connectAgain: (store) => store.connectAgain(),
  tryNow: (store) => store.tryNow(),
  retry: (store) => store.retry(),
};

const Banner: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div role="status" className="alert alert-warning rounded-0 mb-0 text-center">
    <strong>{title}</strong> <span>{body}</span>
  </div>
);

const WalletGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, store } = useSession();
  if (state.phase === "ready" || state.phase === "switching") {
    const network = state.accounts?.network;
    return (
      <>
        {state.phase === "switching" ? (
          <Banner title="Switching account" body="Submitting is paused until GeniusWallet finishes switching." />
        ) : null}
        {network && networkMismatch(network) ? (
          <Banner
            title="Wrong network"
            body={`GeniusWallet is on ${network.sdk ?? "not set"}. This dashboard works on ${servedSdkNetwork() ?? "not set"}. Switch the network in GeniusWallet.`}
          />
        ) : null}
        {children}
      </>
    );
  }
  if (state.phase === "pairing" || state.phase === "pairingDeclined") {
    return (
      <PairPanel
        uri={state.phase === "pairing" ? (state.uri ?? "") : null}
        declined={state.detail}
        onTryAgain={() => store?.connectAgain()}
      />
    );
  }
  const screen = screenFor(state);
  if (!screen) {
    return null;
  }
  const { action, link } = screen;
  return (
    <section className="text-center py-5 container" role="status">
      <h1 className="display-6">{screen.heading}</h1>
      <p className="fs-5">
        {screen.spinner ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> : null}
        {screen.body}
      </p>
      {state.phase === "denied" && state.error?.kind === "rateLimited" ? <p>{state.error.message}</p> : null}
      {action ? (
        <button type="button" className="btn btn-primary" onClick={() => store && RUN[action.run](store)}>
          {action.label}
        </button>
      ) : null}
      {link ? <ExternalLink href={link.href}>{link.label}</ExternalLink> : null}
    </section>
  );
};

export default WalletGate;
