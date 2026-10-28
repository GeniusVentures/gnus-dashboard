import JobDetailView from "../../sub-components/jobs/JobDetailView";
import WalletGate from "../../sub-components/wallet/WalletGate";

const JobDetail: React.FC = () => (
  <WalletGate>
    <JobDetailView />
  </WalletGate>
);

export default JobDetail;
