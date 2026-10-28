import Placeholder from "../sub-components/shared/Placeholder";
import WalletGate from "../sub-components/wallet/WalletGate";

const Dashboard: React.FC = () => (
  <WalletGate>
    <Placeholder title="Dashboard" />
  </WalletGate>
);

export default Dashboard;
