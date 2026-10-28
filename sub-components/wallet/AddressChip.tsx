import React, { useEffect, useRef, useState } from "react";
import { copyText } from "../../lib/copyText";

const FEEDBACK_MS = 2000;

// 0x + the first 4 and last 4 hex digits.
export const shorten = (address: string): string => `${address.slice(0, 6)}...${address.slice(-4)}`;

type Result = "idle" | "copied" | "failed";

interface Props {
  label: string;
  address: string;
  copyName: string;
}

const AddressChip: React.FC<Props> = ({ label, address, copyName }) => {
  const [result, setResult] = useState<Result>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (result === "failed") {
      field.current?.focus();
      field.current?.select();
    }
  }, [result]);

  async function copy(): Promise<void> {
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
    const ok = await copyText(address);
    setResult(ok ? "copied" : "failed");
    if (ok) {
      timer.current = setTimeout(() => setResult("idle"), FEEDBACK_MS);
    }
  }

  return (
    <span className="d-inline-flex flex-wrap align-items-center gap-2">
      <span>
        {label} <code>{shorten(address)}</code>
      </span>
      <button type="button" className="btn btn-sm btn-outline-primary" aria-label={copyName} onClick={copy}>
        Copy
      </button>
      <span aria-live="polite">
        {result === "copied" ? "Copied" : null}
        {result === "failed" ? "Copy failed. Select the address to copy it." : null}
      </span>
      {result === "failed" ? (
        <input ref={field} readOnly className="form-control form-control-sm w-auto" value={address} aria-label={`${label} (full address)`} />
      ) : null}
    </span>
  );
};

export default AddressChip;
