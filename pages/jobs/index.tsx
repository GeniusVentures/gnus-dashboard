import JobsView from "../../sub-components/jobs/JobsView";
import WalletGate from "../../sub-components/wallet/WalletGate";

const Jobs: React.FC = () => (
  <WalletGate>
    <JobsView />
  </WalletGate>
);

export default Jobs;
