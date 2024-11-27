import { Card, Col, Row } from "react-bootstrap";
import BlockExplorerPreview from "sub-components/tables/BlockExplorerPreview";
import TransactionsPreview from "sub-components/tables/TransactionsPreview";
import React, { Fragment, useState, useEffect, useRef } from "react";

// Define types for blocks and transactions
interface Transaction {
  txHash: string;
  type: string;
  value: string;
  time: string;
  height: number;
}

interface Block {
  block: number;
  proposer: string;
  txs: string;
  time: string;
  hash: string;
}

interface BlockchainInfoData {
  height: string;
  transactions: string;
  tokens: number;
}

const BlockchainInfo: React.FC = () => {
  const [blockData, setBlockData] = useState<Block[]>([]);
  const [transData, setTransData] = useState<Transaction[]>([]);
  const [blockchainInfo] = useState<BlockchainInfoData>({
    height: "15,400,118",
    transactions: "1134369",
    tokens: 850527,
  });
  const [transactions, setTransactions] = useState<number>(1134369);
  const [blockHeight, setBlockHeight] = useState<number>(3708);
  const heightRef = useRef<number>(3709);

  // Create a new transaction
  const createTransactions = () => {
    const randomIndex = Math.floor(Math.random() * 5);
    const typeDistribution = [
      "Transfer",
      "Processing",
      "Transfer",
      "Transfer",
      "Processing",
    ];
    const type = typeDistribution[randomIndex];
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const value = `${(Math.random() * 10).toFixed(3)} GNUS`;
    const time = new Date().toISOString();

    const newTransaction: Transaction = {
      txHash,
      type,
      value,
      time,
      height: heightRef.current,
    };

    setTransactions((prev) => prev + 1);
    setTransData((prev) => [newTransaction, ...prev]);
  };

  // Create a new block
  const createBlocks = () => {
    const txs = `${Math.floor(Math.random() * 10)}`;
    const time = new Date().toISOString();
    const hash = `0x${Math.random().toString(16).substr(2, 64)}`;

    const newBlock: Block = {
      block: heightRef.current,
      proposer: "GNUS.AI",
      txs,
      time,
      hash,
    };

    setBlockData((prev) => [newBlock, ...prev]);
    setBlockHeight((prev) => prev + 1);
    heightRef.current += 1;
  };

  // Start generating new transactions periodically
  const newTransactions = () => {
    setTimeout(() => {
      setInterval(createTransactions, 2150);
    }, 2000);
  };

  // Start generating new blocks periodically
  const newBlocks = () => {
    setTimeout(() => {
      setInterval(createBlocks, 3350);
    }, 3500);
  };

  useEffect(() => {
    newTransactions();
    newBlocks();

    // Cleanup intervals when the component unmounts
    return () => {
      clearInterval(heightRef.current as unknown as NodeJS.Timeout);
    };
  }, []);

  return (
    <Fragment>
      <h2
        className="display-7 text-white px-0"
        style={{ fontFamily: "HKModularBold" }}>
        Blockchain Information
      </h2>
      <Row className="justify-content-center px-0 gap-5 mb-5">
        <Col>
          <Card style={{ minWidth: "200px" }} className="h-100">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Height</h4>
              <p className="mb-0 display-4">{blockHeight.toLocaleString()}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="h-100 w-100">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Transactions</h4>
              <p className="mb-0 display-4">{transactions.toLocaleString()}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="h-100">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Tokens</h4>
              <p className="mb-0 display-4">
                {blockchainInfo.tokens.toLocaleString()}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="justify-content-center ps-0 m-0 gap-5">
        <Col className="mb-4 ps-0">
          <BlockExplorerPreview blockData={blockData} />
        </Col>
        <Col className="mb-4">
          <TransactionsPreview transData={transData} />
        </Col>
      </Row>
    </Fragment>
  );
};

export default BlockchainInfo;
