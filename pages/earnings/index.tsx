import Placeholder from "../../sub-components/shared/Placeholder";
import WalletGate from "../../sub-components/wallet/WalletGate";

const Earnings: React.FC = () => (
  <WalletGate>
    <Placeholder title="Earnings" />
  </WalletGate>
);

export default Earnings;
