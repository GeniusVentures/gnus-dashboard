import { Fragment, useEffect, useState } from "react";
import { Card, Col, Row, Image, Table, Modal } from "react-bootstrap";
import BlockExplorer from "sub-components/tables/BlockExplorerPreview";
import Transactions from "sub-components/tables/TransactionsPreview";
import fakeBlocks from "data/fake-data/blocks";
import fakeTransactions from "data/fake-data/transactions";
import NetworkInfo from "sub-components/dashboard/NetworkInfo";

const Landing = () => {
  const [updated, setUpdated] = useState(null);
  const [blockData, setBlockData] = useState([]);
  const [transData, setTransData] = useState([]);
  useEffect(() => {
    setBlockData(fakeBlocks);
    setTransData(fakeTransactions);
    updateDate();
  }, []);

  const updateDate = () => {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentDate = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "short",
      timeZone: userTimeZone,
    };
    const formattedDateTime = currentDate.toLocaleString(undefined, options);
    setUpdated(formattedDateTime);
  };

  return (
    <Fragment>
      <Row className="justify-content-center mx-lg-10">
        <div className="text-center mt-5">
          <h1 className="display-5 text-white">
            GNUS.AI Network Mainnet Dashboard
          </h1>
          <p className="text-white pb-2">Last updated: {updated}</p>
        </div>
        <Row className="justify-content-center">
          <h2 className="display-6 text-white">Blockchain Information</h2>
          <Row className="px-0">
            <Col xl={4} lg={3} md={4} sm={6} xs={11} className="mb-4">
              <Card>
                <Card.Body className="text-white">
                  <h4 className="text-white display-7">Height</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={4} lg={3} md={4} sm={6} xs={11} className="mb-4">
              <Card>
                <Card.Body className="text-white">
                  <h4 className="text-white display-7">Transactions</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={4} lg={3} md={4} sm={6} xs={11} className="mb-4">
              <Card>
                <Card.Body className="text-white">
                  <h4 className="text-white display-7">Community Pool</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={4} lg={3} md={4} sm={6} xs={11} className="mb-4">
              <Card>
                <Card.Body className="text-white">
                  <h4 className="text-white display-7">Tokens</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={4} lg={3} md={4} sm={6} xs={11} className="mb-4">
              <Card>
                <Card.Body className="text-white">
                  <h4 className="text-white display-7">Inflation</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={4} lg={3} md={4} sm={6} xs={11} className="mb-4">
              <Card>
                <Card.Body className="text-white">
                  <h4 className="text-white display-7">Staking APR</h4>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Col xs={11} sm={11} md={11} lg={6} xl={6} className="mb-4">
            <BlockExplorer blockData={blockData} />
          </Col>
          <Col xs={11} sm={11} md={11} lg={6} xl={6} className="mb-4">
            <Transactions transData={transData} />
          </Col>
        </Row>
        <Row className="py-3">
          <NetworkInfo />
        </Row>
      </Row>
    </Fragment>
  );
};

export default Landing;
