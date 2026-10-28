import Placeholder from "../../sub-components/shared/Placeholder";
import WalletGate from "../../sub-components/wallet/WalletGate";

const JobDetail: React.FC = () => (
  <WalletGate>
    <Placeholder title="Job detail" />
  </WalletGate>
);

export default JobDetail;
