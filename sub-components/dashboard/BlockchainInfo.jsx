import { Card, Col, Row } from "react-bootstrap";
import BlockExplorerPreview from "sub-components/tables/BlockExplorerPreview";
import TransactionsPreview from "sub-components/tables/TransactionsPreview";
import fakeBlocks from "data/fake-data/blocks";
import fakeTransactions from "data/fake-data/transactions";

const { Fragment, useState, useEffect, useRef } = require("react");

const BlockchainInfo = () => {
  const [blockData, setBlockData] = useState([]);
  const [transData, setTransData] = useState([]);
  console.log(transData);
  const [blockchainInfo, setBlockchainInfo] = useState({
    height: "15,400,118",
    transactions: "1134369",
    tokens: "825,139.47",
  });
  const [transactions, setTransactions] = useState(1134369);
  const [blockHeight, setBlockHeight] = useState(3708);
  const heightRef = useRef(3709);
  const transactionRef = useRef(16169);
  const createTransactions = () => {
    const random = Math.random().toString()[5];
    console.log(random);
    const typeDistribution = [
      "Transfer",
      "Processing",
      "Transfer",
      "Transfer",
      "Processing",
    ];
    const type = typeDistribution[random % typeDistribution.length];
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const value = `${(Math.random() * 10).toFixed(3)} GNUS`;
    const time = new Date().toISOString();

    // Create a new transaction object
    const newTransaction = {
      txHash,
      type,
      value,
      time,
      height: heightRef.current,
    };

    setTransactions((prevTransactions) => prevTransactions + 1);
    setTransData((prevTransData) => [...prevTransData, newTransaction]);
  };

  const createBlocks = () => {
    console.log("hello");
    const txs = `${(Math.random() * 10).toFixed(0)}`;
    const time = new Date().toISOString();

    // Add a new test data entry to the array
    let newBlock = {
      block: heightRef.current,
      proposer: "GNUS.AI",
      txs,
      time,
    };

    // Update the transData state by creating a new array with the new transaction
    setBlockData((prevBlockData) => [...prevBlockData, newBlock]);
    setBlockHeight((prevBlockHeight) => prevBlockHeight + 1);
    heightRef.current = heightRef.current + 1;
  };

  const newTransactions = () => {
    setTimeout(() => {
      setInterval(() => {
        createTransactions();
      }, 2150);
    }, 2000);
  };

  const newBlocks = () => {
    setTimeout(() => {
      setInterval(() => {
        createBlocks();
      }, 3350);
    }, 2000);
  };

  useEffect(() => {
    setBlockData(fakeBlocks);
    setTransData(fakeTransactions);
    // newTransactions();
    // newBlocks();
  }, []);

  return (
    <Fragment>
      <h2
        className="display-7 text-white px-0"
        style={{ fontFamily: "HKModularBold" }}
      >
        Blockchain Information
      </h2>
      <Row className="justify-content-center px-0">
        <Col xl={4} lg={3} md={4} sm={6} xs={12} className="mb-4">
          <Card className="h-100 blur">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Height</h4>
              <p className="mb-0 display-4">{blockHeight}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4} lg={3} md={4} sm={6} xs={12} className="mb-4">
          <Card className="h-100 blur">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Transactions</h4>
              <p className="mb-0 display-4">{transactions}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4} lg={3} md={4} sm={6} xs={12} className="mb-4">
          <Card className="h-100 blur">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Tokens</h4>
              <p className="mb-0 display-4">{blockchainInfo.tokens}</p>
            </Card.Body>
          </Card>
        </Col>
        {/* <Col xl={4} lg={3} md={4} sm={6} xs={12} className="mb-4">
          <Card className="h-100 blur">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Community Pool</h4>
              <p className="mb-0 display-5">{blockchainInfo.pool}</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4} lg={3} md={4} sm={6} xs={12} className="mb-4">
          <Card className="h-100 blur">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Inflation</h4>
              <p className="mb-0 display-5">{blockchainInfo.inflation}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4} lg={3} md={4} sm={6} xs={12} className="mb-4">
          <Card className="h-100 blur">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Staking APR</h4>
              <p className="mb-0 display-5">{blockchainInfo.apr}</p>
            </Card.Body>
          </Card>
        </Col> */}
      </Row>
      <Row className="justify-content-center ps-0 m-0">
        <Col xs={12} sm={12} md={12} lg={6} xl={6} className="mb-4 ps-0">
          <BlockExplorerPreview blockData={blockData.reverse().slice(0, 9)} />
        </Col>
        <Col xs={12} sm={12} md={12} lg={6} xl={6} className="mb-4">
          <TransactionsPreview transData={transData.reverse().slice(0, 9)} />
        </Col>
      </Row>
    </Fragment>
  );
};
export default BlockchainInfo;
