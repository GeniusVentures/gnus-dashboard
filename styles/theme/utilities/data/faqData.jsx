import { v4 as uuid } from "uuid";

export const FAQList = [
  {
    id: uuid(),
    title: "What is a Funding Chain?",
    content:
      "Discover the innovative concept of Funding Chain smart contract funraisers! These cutting-edge mechanisms empower you to raise funds for your endeavors in a whole new way. Leveraging the power of smart contracts on a secure blockchain, Funding Chain smart contract fundraisers guarantee that every donation reaches its intended recipient. Embrace the future of fundraising with confidence.",
  },
  {
    id: uuid(),
    title: "How can I contribute to a Funding Chain?",
    content: `
        <p>Contributing to a Funding Chain is a simple and impactful way to support causes that matter to you. Here are the steps to contribute using Ethereum:</p>
        
        <ol>
            <li><strong>Access the Funding Chain:</strong> Visit the campaign page of the Funding Chain you wish to support. You'll find details about the cause and its progress.</li>
            <li><strong>Choose an Amount:</strong> Decide on the amount you want to contribute to the campaign.</li>
            <li><strong>Select Contribution Method:</strong> You have several options to contribute to a Funding Chain:</li>
                <ul>
                    <li><strong>Built-in Wallet:</strong> If you're a registered user with a built-in wallet on our platform, you can directly contribute from your account.</li>
                    <li><strong>Web 3 Wallet Provider:</strong> Connect your Web 3 wallet, such as <a target="_blank" rel="noreferrer"href='https://metamask.io/'>MetaMask</a>, to seamlessly contribute from your wallet's balance.</li>
                    <li><strong>Direct Send:</strong> Alternatively, you can send Ethereum directly to the smart contract address provided for the campaign.</li>
                </ul>
            <li><strong>Confirmation and Receipt:</strong> Review your contribution details and confirm the transaction. Once the Ethereum transaction is confirmed on the blockchain, you'll receive a confirmation receipt as proof of your contribution.</li>
        </ol>
        
        <p>By contributing to a Funding Chain, you're not only making a positive impact but also participating in a transparent and efficient fundraising process powered by blockchain technology.</p>
        
        <p>If you have any inquiries about contributing to a specific campaign, using Ethereum, or our platform's contribution process, our support team is available to assist you.</p>
    `,
  },
  {
    id: uuid(),
    title: "How much does it cost to start a Funding Chain?",
    content:
      "Embark on your Funding Chain journey without worrying about initiation fees! We are proud to offer the opportunity to start a new Funding Chain at no charge. Keep in mind, however, that there will be transaction fees associated with deploying your Funding Chain's smart contract on the blockchain network of your choice. These fees can vary depending on the blockchain you opt for. Notably, transaction fees on the Ethereum blockchain tend to be higher compared to the Hedera Hashgraph. Rest assured, we're committed to transparency and helping you make informed decisions.",
  },
  {
    id: uuid(),
    title: "What is an Interchain Wallet?",
    content: `
        <p>An Interchain Wallet is a special type of digital wallet that has the unique ability to work across multiple blockchain networks, such as Ethereum, Hedera Hashgraph, and, in the future, Ethereum Layer 2 solutions. Let's break this down in simple terms:</p>
        
        <strong>Versatility:</strong>
        <p>Imagine your wallet as a keychain. Each blockchain is like a different lock, and each lock requires a specific key. An Interchain Wallet is like a master key that can open multiple locks (blockchains) instead of just one.</p>

        <strong>Ethereum Compatibility:</strong>
        <p>If you already have an Ethereum address, congratulations! You technically already possess the foundation of an Interchain Wallet. Your Ethereum private key is like the main key on your keychain.</p>

        <strong>Extending to Hedera:</strong>
        <p>To make your Ethereum-based Interchain Wallet work with Hedera, you need to derive the Hedera private key from your existing Ethereum private key. For those who are technically inclined, <a href='https://medium.com/@blockchainTrucker/creating-a-hedera-hashgraph-wallet-from-your-ethereum-private-key-13f9927abce9' target="_blank" rel="noreferrer">this can be done with just a few lines of code</a>. However, many Web3 wallet services, such as Metamask or Brave, do this to your existing wallet automatically for you when you <a href='https://chainlist.org/?testnets=false&search=hedera+mainnet' target="_blank" rel="noreferrer">add the Hedera network</a>.</p>

        <strong>Funding Chain Integration:</strong>
        <p>When you use Funding Chain, our application provides you with a ready-to-use Interchain Wallet. This wallet is fully equipped for all Hedera and Ethereum Mainnet transactions. In the future, we will also integrate with Ethereum Layer 2 solutions, making your wallet even more versatile.</p>

        <p>In summary, an Interchain Wallet simplifies your blockchain experience by allowing you to manage assets on multiple blockchains with a single wallet. If you have any more questions or need assistance, feel free to reach out to us!</p>`,
  },
  {
    id: uuid(),
    title:
      "What are the transaction fees associated with transactions on blockchains?",
    content:
      "<p>Transaction fees, often referred to as 'gas' or 'network fees,' are a fundamental aspect of blockchain transactions. They ensure the functioning and security of the blockchain network, and they vary based on the network's architecture, demand, and other factors.</p><p>When you initiate a transaction on a blockchain, whether it's sending funds, interacting with a smart contract, or any other action that requires computational work, you're essentially requesting the network's resources.</p><p>Here's an in-depth breakdown of transaction fees and their components:</p><ol><li><strong>Gas Price</strong>: This is the amount you're willing to pay for each unit of computational work. A higher gas price increases the likelihood of your transaction being processed faster.</li><br/><li><strong>Gas Limit</strong>: It represents the maximum amount of computational work your transaction can consume. More complex transactions or interactions with smart contracts require a higher gas limit.</li><br/><li><strong>Total Fee</strong>: The total fee you'll pay for a transaction is calculated as the product of the gas price and gas limit.</li><br/><li><strong>Network Congestion</strong>: During periods of high demand, network congestion can drive up gas prices. Conversely, during quieter times, gas prices may decrease.</li><br/><li><strong>Blockchain Network</strong>: Different blockchains have varying fee structures. For example, Ethereum's fees tend to be higher due to its popularity and computational intensity, while newer or less active blockchains might have lower fees.</li><br/><li><strong>Fee Predictors</strong>: Online platforms provide estimations of current gas prices, helping you choose an appropriate gas price for your transaction.</li></ol><p>At Funding Chain, we understand that transaction fees are a crucial consideration for our users. We recommend carefully assessing the blockchain's fee structure before engaging in any transactions to make informed decisions.</p>",
  },
  {
    id: uuid(),
    title: "How do others contribute to my fundraiser?",
    content: `<p>Empowering contributors from across the globe is central to Funding Chain. Once you launch your Funding Chain, you'll receive the unique address of your smart contract. This address enables individuals from any location to send funds directly to your fundraiser. But that's not all! To enhance accessibility, we'll also provide a user-friendly donation option on our website, allowing supporters to contribute conveniently through a seamless process.</p><p>At Funding Chain, our mission is to streamline the contribution process and make fundraising an inclusive experience for both creators and contributors. By combining the power of blockchain technology with user-friendly features, we're redefining the way fundraising is done.</p>
    `,
  },
  {
    id: uuid(),
    title: "Are you going to sell my information?",
    content: `
        <p>Absolutely not! At Funding Chain, we hold your privacy and data security in the highest regard. We are committed to safeguarding your personal information and will never engage in the practice of selling your data.</p>
        <p>Your trust is essential to us, and we prioritize maintaining a transparent and ethical approach when it comes to handling your information. Rest assured that your personal data remains strictly confidential and will be used solely for the purpose of enhancing your experience and supporting your fundraising efforts.</p>
    `,
  },
  {
    id: uuid(),
    title:
      "What makes Funding Chain different than other crowdfunding websites?",
    content: `<p>At Funding Chain, we stand for principles that set us apart from other crowdfunding platforms. We prioritize user privacy and staunchly reject the notion of censorship. Unlike some websites that have cancelled fundraisers or withheld funds based on their own beliefs, we firmly believe that censorship has no place in our society. If you're within the bounds of the law, we respect your right to raise funds for your cause, whatever it may be.</p><p>Moreover, Funding Chain distinguishes itself through the use of smart contracts. Once you initiate your Funding Chain, it becomes an immutable entity. It will continue to operate and collect donations for the specified duration, ensuring your fundraising efforts remain intact. When the time comes, the smart contract will execute the payout according to its original configuration. This level of reliability is reinforced by the fact that even we, the creators, lack the power to halt or interfere with the smart contract's operations.</p><p>We're committed to transparency, autonomy, and the unwavering support of your fundraising endeavors. With Funding Chain, you're empowered to drive change and secure the resources you need without fear of censorship or disruption.</p>`,
  },
  {
    id: uuid(),
    title:
      "What if I think a fundraiser on Funding Chain is fraudulent or breaking the law?",
    content: `
        <p>When it comes to contributing to fundraisers on Funding Chain, your vigilance and discernment play a crucial role. We encourage you to exercise due diligence before making any donations. Conduct thorough research to ensure the legitimacy and credibility of the fundraiser. Trust your instincts and exercise your best judgment to determine whether the cause aligns with your values and is a worthy use of your hard-earned money.</p>
        
        <p>If you suspect that a fundraiser on Funding Chain may be fraudulent or violating the law, we take this matter seriously. We urge you to take the following steps:</p>
        
        <ol>
            <li><strong>Report to Us</strong>: Reach out to us with your concerns. You can use our designated reporting channels to provide information about the fundraiser and the reasons for your suspicion.</li>
            <li><strong>Notify Appropriate Authorities</strong>: If you believe the fundraiser is breaking the law, it's essential to inform the relevant authorities or regulatory bodies. This step ensures that the appropriate actions are taken in accordance with the law.</li>
        </ol>
        
        <p>At Funding Chain, we are committed to maintaining a safe and ethical platform. Your proactive involvement helps us uphold the integrity of the community and protect the interests of both creators and contributors.</p>
    `,
  },
  {
    id: uuid(),
    title: "What is a smart contract?",
    content: `
        <p>A smart contract is a revolutionary concept that combines the principles of traditional contracts with the capabilities of blockchain technology. Think of it as a digital contract that enforces and executes the terms of an agreement in an automated, tamper-proof, and trustless manner.</p>
        
        <p>Unlike a physical contract that relies on intermediaries and manual enforcement, a smart contract operates as self-executing code on a blockchain, such as Ethereum or Hedera. Once deployed to the blockchain, the terms of the contract are encoded into the code, and its execution becomes a part of the blockchain's immutable history.</p>
        
        <p>Here's how it works:</p>
        
        <p>1. <strong>Establishing the Agreement</strong>: Similar to a traditional contract, a smart contract defines the terms, conditions, and actions that need to be carried out by the involved parties.</p>
        
        <p>2. <strong>Code Execution</strong>: The terms of the smart contract are written as code, often in languages like Solidity. This code resides on the blockchain and automatically executes when specific conditions are met.</p>
        
        <p>3. <strong>Trustless and Automated</strong>: The code's execution is trustless, meaning it happens exactly as programmed, without relying on intermediaries. This automation eliminates the need for third parties to oversee the contract.</p>
        
        <p>4. <strong>Immutable and Transparent</strong>: Once deployed to the blockchain, a smart contract's code and execution history are immutable. No one, not even the creators, can alter the contract's terms or outcomes retroactively.</p>
        
        <p>5. <strong>Use Cases</strong>: Smart contracts have a wide range of applications, from financial transactions to supply chain management. They can facilitate automated payments, voting mechanisms, decentralized applications (dApps), and more.</p>
        
        <p>At Funding Chain, we utilize the power of smart contracts to create a robust and transparent fundraising platform. Our Funding Chain smart contract is meticulously designed to ensure transparency, immutability, and adherence to the specified terms. Once deployed, the Funding Chain smart contract becomes a dependable and unalterable mechanism for collecting and distributing funds according to the fundraising campaign's rules.</p>
    `,
  },
  {
    id: uuid(),
    title: "Are refunds available for contributions made to a Funding Chain?",
    content: `
        <p>Once a contribution is made to a Funding Chain, it becomes an integral and immutable part of the blockchain's history. The smart contract associated with the campaign enforces the execution of transactions based on predefined terms.</p>
        
        <p>It's important to note that contributions made to Funding Chains are intended to directly support the campaign's cause. Due to the nature of blockchain transactions and smart contracts, traditional refund mechanisms are not applicable.</p>
        
        <p>Before making a contribution, we strongly recommend carefully reviewing the campaign's details, objectives, and terms to ensure you are fully committed to your decision.</p>
        
        <p>Please be aware that once the smart contract executes and the transaction is confirmed on the blockchain, the refunding process for contributions is not possible.</p>
        
        <p>We appreciate your understanding of this policy as it allows us to maintain the integrity and transparency of your fundraisers.</p>
    `,
  },
  {
    id: uuid(),
    title: "What is a Blockchain?",
    content: `
        <p>A blockchain is a revolutionary technology that underlies digital currencies like Bitcoin and has broader applications beyond just cryptocurrency. At its core, a blockchain is a decentralized and distributed digital ledger that records transactions across multiple computers or nodes.</p>
        
        <p>Key characteristics of a blockchain:</p>
        
        <ul>
            <li><strong>Decentralization:</strong> Unlike traditional systems that rely on a central authority, a blockchain operates on a network of nodes, each maintaining a copy of the entire ledger. This decentralization enhances security and resilience.</li>
            <li><strong>Transparency:</strong> Every transaction added to the blockchain is visible to all participants in the network. This transparency ensures accountability and prevents tampering.</li>
            <li><strong>Immutability:</strong> Once a transaction is recorded on the blockchain, it cannot be altered or deleted. This feature ensures the integrity of the ledger over time.</li>
            <li><strong>Cryptography:</strong> Transactions are secured through advanced cryptographic techniques, ensuring data privacy and protection.</li>
        </ul>
        
        <p>Blockchains are made up of blocks, each containing a batch of transactions. These blocks are linked together in chronological order, creating a chain of blocks, hence the term "blockchain." The process of validating and adding new blocks to the chain is achieved through consensus mechanisms like Proof of Work or Proof of Stake.</p>
        
        <p>While initially used for cryptocurrencies, blockchains have expanded their use to various industries. They power applications in supply chain management, healthcare, voting systems, and more. The technology's potential to enhance security, transparency, and efficiency has led to significant innovation and exploration of new use cases.</p>
        
        <p>At Funding Chain, we leverage blockchain technology to create a secure and transparent environment for fundraising, utilizing smart contracts to automate processes while maintaining the integrity of transactions.</p>
    `,
  },
  {
    id: uuid(),
    title: "I sent a transaction to the wrong address. What can I do?",
    content: `
        <p>It's important to understand that blockchain transactions are designed to be irreversible. Once a transaction is confirmed and added to the blockchain, it becomes a permanent part of the ledger and cannot be undone.</p>
        
        <p>If you've accidentally sent a transaction to the wrong address, it's crucial to be aware that there is no built-in mechanism for reversing or retrieving the funds.</p>
        
        <p>Here are some steps to consider:</p>
        
        <ol>
            <li><strong>Double-check the Address:</strong> Before making any transactions, carefully review and verify the recipient's address to prevent errors.</li>
            <li><strong>Contact the Recipient:</strong> If you have the means to communicate with the recipient, you can explain the situation and ask if they are willing to return the funds. However, this is entirely at their discretion.</li>
            <li><strong>Learn from the Experience:</strong> Mistakes can happen in the fast-paced world of cryptocurrencies. Use this as an opportunity to enhance your understanding of blockchain transactions and increase your vigilance.</li>
        </ol>
        
        <p>Blockchain's immutability and security features are key strengths, but they also mean that transactions cannot be reversed. This is a fundamental aspect of the technology and contributes to its trustless nature.</p>
        
        <p>We strongly advise double-checking all transaction details and addresses before confirming any transfers to ensure accuracy and prevent any unintended transactions.</p>
        
        <p>If you have further questions or concerns, our support team is here to provide guidance and assistance.</p>
    `,
  },
  {
    id: uuid(),
    title:
      "Why is the image I am trying to upload being flagged as inappropriate?",
    content: `
        <p>If you're encountering a situation where an image you're attempting to upload is being flagged as inappropriate, there could be several reasons for this occurrence:</p>
        
        <ol>
            <li><strong>Content Violation:</strong> The image might contain content that violates our platform's content guidelines or policies. These guidelines are in place to ensure a safe and respectful environment for all users.</li>
            <li><strong>Automated Filters:</strong> Our platform uses automated filters that analyze images for keywords, patterns, or visual elements that might indicate inappropriate content.</li>
            <li><strong>False Positives:</strong> Automated filters can sometimes generate false positives, flagging innocent images due to similarities with inappropriate content.</li>
            <li><strong>Context:</strong> The image's context or interpretation by automated systems could lead to a false flag. For instance, certain elements might be misinterpreted if they remotely resemble inappropriate content.</li>
            <li><strong>User Reports:</strong> If other users have reported the image as inappropriate, it might result in its temporary removal or flagging for manual review.</li>
        </ol>
        
        <p>If you believe your image has been flagged incorrectly:</p>
        
        <ul>
            <li>Review our platform's content guidelines to ensure your image aligns with our allowed content.</li>
            <li>Check the image's content to verify that it doesn't include anything that could be misinterpreted as inappropriate.</li>
            <li>Contact our support team for assistance and clarification on why the image was flagged.</li>
        </ul>
        
        <p>We appreciate your understanding as we strive to maintain a safe and respectful environment for all users. If you have further questions or concerns, our support team is here to help.</p>
    `,
  },
  {
    id: uuid(),
    title: "Can I store all of my crypto in my Funding Chain custodial wallet?",
    content: `
        <p>While we implement the highest levels of security for our Funding Chain custodial wallets, it's important to note that it's not advisable to store all of your crypto assets in any single wallet, including custodial ones.</p>
        
        <p>We prioritize security and take extensive measures to safeguard your assets within the Funding Chain custodial wallet. However, the safest approach to managing your crypto holdings involves utilizing a non-custodial wallet, such as BlockWallet, MetaMask or other reputable Web 3 wallet providers and hardware wallets.</p>
        
        <p><strong>Why Non-Custodial Wallets?</strong></p>
        
        <p>Non-custodial wallets provide you with full control over your crypto assets. Unlike custodial wallets, where a third party manages your assets on your behalf, non-custodial wallets ensure that only you have access to your private keys and funds. This heightened control enhances security and minimizes the risks associated with centralized storage.</p>
        
        <p><strong>Funding Chain Wallet Limitations:</strong></p>
        
        <p>The Funding Chain wallet is designed to securely manage Ethereum and Hedera-based assets and facilitate contributions to campaigns on our platform. However, it is not suitable for managing alt coins or other tokens or NFTs on either network. If you send alt coins or NFTs to the Funding Chain wallet, they may be lost as they are not compatible with it's intended functionality.</p>
        
        <p>We encourage you to make informed decisions about wallet usage, prioritize security, and consider diversifying your crypto holdings across multiple secure and reputable non-custodial wallets.</p>
        
        <p>If you have further questions about wallet security, usage, or our platform's wallet capabilities, our support team is here to provide guidance and assistance.</p>
    `,
  },
];

export default FAQList;
