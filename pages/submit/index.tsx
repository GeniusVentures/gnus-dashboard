import Placeholder from "../../sub-components/shared/Placeholder";
import WalletGate from "../../sub-components/wallet/WalletGate";

const Submit: React.FC = () => (
  <WalletGate>
    <Placeholder title="Submit a job" />
  </WalletGate>
);

export default Submit;
