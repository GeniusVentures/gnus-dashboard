import React, { useEffect, useRef, useState } from "react";
import { copyText } from "../../lib/copyText";
import ExternalLink from "../shared/ExternalLink";

const FEEDBACK_MS = 2000;
const SITE = "https://gnus.ai/";

type Result = "idle" | "copied" | "failed";

const PairPanel: React.FC<{ uri: string }> = ({ uri }) => {
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
    const ok = await copyText(uri);
    setResult(ok ? "copied" : "failed");
    if (ok) {
      timer.current = setTimeout(() => setResult("idle"), FEEDBACK_MS);
    }
  }

  return (
    <section className="text-center py-5 container" aria-labelledby="pair-heading">
      <h1 className="display-6" id="pair-heading">
        Connect GeniusWallet
      </h1>
      <p className="fs-5">Scan this code with GeniusWallet, or copy the link into GeniusWallet.</p>
      <p>
        <code className="text-break">{uri}</code>
      </p>
      <p>
        <button type="button" className="btn btn-primary" onClick={copy}>
          Copy link
        </button>
      </p>
      <p aria-live="polite">
        {result === "copied" ? "Link copied" : null}
        {result === "failed" ? "Copy failed. Select the link above to copy it." : null}
      </p>
      <ExternalLink href={SITE}>Get GeniusWallet</ExternalLink>
    </section>
  );
};

export default PairPanel;
