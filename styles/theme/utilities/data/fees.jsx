const fees = () => {
  return (
    <div>
      <p>
        <strong>Last Updated: 11/11/2023</strong>
      </p>
      <p>
        {`This Fees Policy outlines the fees associated with using the Funding
        Chain application ("Funding Chain" or "the app") owned by Decentralized
        Ventures, LLC ("we," "us," or "our"). Please read this policy carefully
        to understand the fees that may apply to your use of the app.`}
      </p>
      <h4>What are Gas Fees?</h4>
      <p>
        Gas fees are a form of transaction fees in the blockchain world. In
        simple terms, gas fees represent the cost of computational resources
        required to process and validate transactions on the blockchain network.
        Think of it like the fuel needed to power a vehicle. In the blockchain
        context, gas fees ensure that transactions are processed in a secure and
        efficient manner.
      </p>
      <h4>Gas Fees on Funding Chain</h4>
      <p>
        When you use the Funding Chain app, you may encounter gas fees for
        certain activities. These gas fees are incurred when interacting with
        the blockchain network and cover the costs associated with transaction
        processing and verification. The specific gas fees and their calculation
        methods are as follows:
      </p>
      <ul>
        <li>
          Creation of a Funding Chain: Gas fees are charged when a user creates
          a new Funding Chain. The gas fee amount is determined based on the
          complexity and resource requirements of creating and deploying a smart
          contract on the blockchain network and by how busy the network is at
          the time.
        </li>
        <li>
          Contribution to a Funding Chain: Gas fees are charged when a user
          contributes funds to a Funding Chain. The gas fee amount is calculated
          based on the computational resources required to process the
          transaction and by how busy the network is at the time.
        </li>
        <li>
          Sending of Funds: Gas fees may be charged when a user withdraws funds
          from their Funding Chain account. The gas fee amount is determined
          based on the withdrawal method and associated transaction costs on the
          blockchain network and by how busy the network is at the time.
        </li>
        <li>
          Withdraw or Early Withdraw from Funding Chain smart contracts: Gas
          fees may be charged when a user withdraws funds from their Funding
          Chain smart contracts. The gas fee amount is determined based on the
          withdrawal method and associated transaction costs on the blockchain
          network and by how busy the network is at the time.
        </li>
      </ul>
      <p>
        Please note that gas fees are not collected by us. Instead, they are
        paid directly to the blockchain network to incentivize miners or
        validators to process and include the transactions in the blockchain. We
        do not profit from these gas fees.
      </p>
      <h4>Funding Chain Fees</h4>
      <p>
        In addition to gas fees, Funding Chain charges the following platform
        fees:
      </p>
      <ul>
        <li>
          {`Withdrawal Fee: A fee of 3% is charged based on the withdrawal amount
          at the end of the Funding Chain's duration.`}
        </li>
        <li>
          Early Withdrawal Fee: If an early withdrawal is completed while the
          Funding Chain is still running, a fee of 5% is charged based on the
          withdrawal amount.
        </li>
        <li>
          {`Sending cryptocurrencies using the Send Funds feature will incur a $1
          (USD) fee per sent transaction paid in the form of the currency being
          sent. This fee is applicable to transactions initiated through the
          Send Funds feature and is not charged for user contributions to
          fundraisers through the Make a Contribution feature.`}
        </li>
      </ul>
      <p>
        The Funding Chain fees are built into the smart contracts and are
        collected by us. These fees are separate from the gas fees paid to the
        blockchain networks.
      </p>
      <p>
        {`Funding Chain does not collect any fees for the creation of a new smart
        contract. Gas fees for creating a new Funding Chain are charged by the
        blockchain network as noted in the "Gas Fees on Funding Chain" section.`}
      </p>
      <h4>Contact Information</h4>
      <p>
        If you have any questions, concerns, or inquiries regarding the Fees
        Policy, please contact us using the information provided below:
      </p>
      <p className="mb-0">Decentralized Ventures, LLC</p>
      <p className="m-0">Attn: Funding Chain</p>
      <p className="m-0">P.O. Box 141</p>
      <p className="mt-0">Powhatan, VA 23139</p>
      <p>
        Email:{" "}
        <a href="mailto:support@fundingchain.io">support@fundingchain.io</a>
      </p>
    </div>
  );
};

export default fees;
