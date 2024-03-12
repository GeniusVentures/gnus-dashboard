import { Card, Col, Row } from "react-bootstrap";
import BlockExplorerPreview from "sub-components/tables/BlockExplorerPreview";
import TransactionsPreview from "sub-components/tables/TransactionsPreview";
import fakeBlocks from "data/fake-data/blocks";
import fakeTransactions from "data/fake-data/transactions";

const { Fragment, useState, useEffect } = require("react");

const BlockchainInfo = () => {
  const [blockData, setBlockData] = useState([]);
  const [transData, setTransData] = useState([]);
  const [blockchainInfo, setBlockchainInfo] = useState({
    height: "15,400,118",
    transactions: "11,387,178",
    tokens: "230.27M",
  });

  useEffect(() => {
    setBlockData(fakeBlocks);
    setTransData(fakeTransactions);
  }, []);

  return (
    <Fragment>
      <h2 className="display-6 text-white px-0">Blockchain Information</h2>
      <Row className="justify-content-center px-0">
        <Col xl={4} lg={3} md={4} sm={6} xs={12} className="mb-4">
          <Card className="h-100 blur">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Height</h4>
              <p className="mb-0 display-5">{blockchainInfo.height}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4} lg={3} md={4} sm={6} xs={12} className="mb-4">
          <Card className="h-100 blur">
            <Card.Body className="text-white">
              <h4 className="text-white fs-4">Transactions</h4>
              <p className="mb-0 display-5">{blockchainInfo.transactions}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4} lg={3} md={4} sm={6} xs={12} className="mb-4">
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
              <h4 className="text-white fs-4">Tokens</h4>
              <p className="mb-0 display-5">{blockchainInfo.tokens}</p>
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
        </Col>
      </Row>
      <Row className="justify-content-center ps-0 m-0">
        <Col xs={12} sm={12} md={12} lg={6} xl={6} className="mb-4 ps-0">
          <BlockExplorerPreview blockData={blockData} />
        </Col>
        <Col xs={12} sm={12} md={12} lg={6} xl={6} className="mb-4">
          <TransactionsPreview transData={transData} />
        </Col>
      </Row>
    </Fragment>
  );
};
export default BlockchainInfo;
