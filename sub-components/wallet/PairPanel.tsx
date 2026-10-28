import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { copyText } from "../../lib/copyText";
import ExternalLink from "../shared/ExternalLink";

const FEEDBACK_MS = 2000;
const SITE = "https://gnus.ai/";

type Result = "idle" | "copied" | "failed";

interface Props {
  /** The pairing link, or null after the wallet declined. */
  uri: string | null;
  /** The wallet's own words for declining, shown as plain text. */
  declined?: string | null;
  onTryAgain(): void;
}

const PairPanel: React.FC<Props> = ({ uri, declined, onTryAgain }) => {
  const [result, setResult] = useState<Result>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  async function copy(): Promise<void> {
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
    const ok = await copyText(uri ?? "");
    setResult(ok ? "copied" : "failed");
    if (ok) {
      timer.current = setTimeout(() => setResult("idle"), FEEDBACK_MS);
    }
  }

  if (uri === null) {
    return (
      <section className="text-center py-5 container" role="status">
        <h1 className="display-6">GeniusWallet declined the connection.</h1>
        {declined ? <p className="fs-5">{declined}</p> : null}
        <button type="button" className="btn btn-primary" onClick={onTryAgain}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="text-center py-5 container" aria-labelledby="pair-heading">
      <h1 className="display-6" id="pair-heading">
        Connect GeniusWallet
      </h1>
      <p className="fs-5">Scan this code with GeniusWallet, or copy the link into GeniusWallet.</p>
      <p>
        <span className="d-inline-block bg-white border border-secondary rounded p-3">
          <QRCodeSVG
            value={uri}
            size={224}
            marginSize={0}
            bgColor="#ffffff"
            fgColor="#000000"
            role="img"
            aria-label="WalletConnect pairing code"
          />
        </span>
      </p>
      <p>
        <button type="button" className="btn btn-primary" onClick={copy}>
          Copy link
        </button>
      </p>
      <p aria-live="polite">
        {result === "copied" ? "Link copied" : null}
        {result === "failed" ? "Copy failed. Select the link below to copy it." : null}
      </p>
      {result === "failed" ? (
        <p>
          <code className="text-break">{uri}</code>
        </p>
      ) : null}
      <ExternalLink href={SITE}>Get GeniusWallet</ExternalLink>
    </section>
  );
};

export default PairPanel;
