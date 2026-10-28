import SubmitFlow from "../../sub-components/submit/SubmitFlow";
import WalletGate from "../../sub-components/wallet/WalletGate";

const Submit: React.FC = () => (
  <WalletGate>
    <SubmitFlow />
  </WalletGate>
);

export default Submit;
