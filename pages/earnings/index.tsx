import EarningsView from "../../sub-components/earnings/EarningsView";
import WalletGate from "../../sub-components/wallet/WalletGate";

const Earnings: React.FC = () => (
  <WalletGate>
    <EarningsView />
  </WalletGate>
);

export default Earnings;
