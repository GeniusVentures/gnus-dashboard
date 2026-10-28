import Placeholder from "../../sub-components/shared/Placeholder";
import WalletGate from "../../sub-components/wallet/WalletGate";

const Jobs: React.FC = () => (
  <WalletGate>
    <Placeholder title="My jobs" />
  </WalletGate>
);

export default Jobs;
