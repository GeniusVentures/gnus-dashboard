import { formatAmount } from "../../lib/gnus/amount";

// Every amount and count on screen goes through this component; it formats nothing itself.
export default function Amount(props: {
  value: string | null;
  decimals: number;
  symbol?: string;
  unavailable?: string;
}): JSX.Element {
  const formatted = formatAmount(props.value, props.decimals);
  if (formatted === null) {
    return <span>{props.unavailable ?? "Not available yet"}</span>;
  }
  return <span>{props.symbol ? `${formatted} ${props.symbol}` : formatted}</span>;
}
