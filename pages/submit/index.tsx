import SubmitAwayNotice from "../../sub-components/submit/SubmitAwayNotice";
import SubmitFlow from "../../sub-components/submit/SubmitFlow";
import WalletGate from "../../sub-components/wallet/WalletGate";

const Submit: React.FC = () => (
  <>
    <SubmitAwayNotice />
    <WalletGate>
      <SubmitFlow />
    </WalletGate>
  </>
);

export default Submit;
