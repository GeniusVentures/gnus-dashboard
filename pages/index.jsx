import { Fragment, useEffect, useState } from "react";
import { Card, Col, Row, Image, Table } from "react-bootstrap";
import BlockExplorer from "sub-components/tables/BlockExplorerPreview";
import Transactions from "sub-components/tables/TransactionsPreview";
import fakeBlocks from "data/fake-data/blocks";
import fakeTransactions from "data/fake-data/transactions";

const Landing = () => {
  const [updated, setUpdated] = useState(null);
  const [displayer, setDisplayer] = useState(null);
  const [chart, setChart] = useState(null);
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
      <div className="video-background">
        <video autoPlay loop muted>
          <source src="/videos/gnus-ai-background.mp4" type="video/mp4" />
        </video>
      </div>
      <Row className="justify-content-center">
        <div className="text-center mt-5">
          <h1 className="display-5 text-white">
            GNUS.AI Network Mainnet Dashboard
          </h1>
          <p className="text-white pb-2">Last updated: {updated}</p>
        </div>
        <Row className="justify-content-center">
          <h2 className="display-6 text-white text-center">Network Activity</h2>
          <Col xs={11} sm={11} md={11} lg={6} xl={5} className="mb-4">
            <BlockExplorer blockData={blockData} />
          </Col>
          <Col xs={11} sm={11} md={11} lg={6} xl={5} className="mb-4">
            <Transactions transData={transData} />
          </Col>
        </Row>
        <Row className="py-3 justify-content-center text-white">
          <Row>
            <h2 className="display-6 text-white text-center">
              Network Information
            </h2>
          </Row>
          <Col xl={2} lg={3} md={4} sm={6} xs={11} className="mb-4">
            <Card>
              <Card.Body className="text-white">test</Card.Body>
              <Card.Footer
                className="p-0"
                as={"button"}
                onClick={(e) => {
                  console.log(true);
                }}
              >
                <p className="my-auto py-2 text-white">
                  See Chart{" "}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    height="24"
                    viewBox="0 -960 960 960"
                    width="24"
                    className="pb-1"
                  >
                    <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
                  </svg>
                </p>
              </Card.Footer>
            </Card>
          </Col>
          <Col xl={2} lg={3} md={4} sm={6} xs={10} className="mb-4">
            <Card>
              <Card.Body></Card.Body>
              <Card.Footer
                className="p-0 "
                as={"button"}
                onClick={(e) => {
                  console.log(true);
                }}
              >
                <p className="my-auto py-2 text-white">
                  See Chart{" "}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    height="24"
                    viewBox="0 -960 960 960"
                    width="24"
                    className="pb-1"
                  >
                    <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
                  </svg>
                </p>
              </Card.Footer>
            </Card>
          </Col>
          <Col xl={2} lg={3} md={4} sm={6} xs={10} className="mb-4">
            <Card>
              <Card.Body></Card.Body>
              <Card.Footer
                className="p-0 "
                as={"button"}
                onClick={(e) => {
                  console.log(true);
                }}
              >
                <p className="my-auto py-2 text-white">
                  See Chart{" "}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    height="24"
                    viewBox="0 -960 960 960"
                    width="24"
                    className="pb-1"
                  >
                    <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
                  </svg>
                </p>
              </Card.Footer>
            </Card>
          </Col>
          <Col xl={2} lg={3} md={4} sm={6} xs={10} className="mb-4">
            <Card>
              <Card.Body></Card.Body>
              <Card.Footer
                className="p-0 "
                as={"button"}
                onClick={(e) => {
                  console.log(true);
                }}
              >
                <p className="my-auto py-2 text-white">
                  See Chart{" "}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    height="24"
                    viewBox="0 -960 960 960"
                    width="24"
                    className="pb-1"
                  >
                    <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
                  </svg>
                </p>
              </Card.Footer>
            </Card>
          </Col>
          <Col xl={2} lg={3} md={4} sm={6} xs={10} className="mb-4">
            <Card>
              <Card.Body></Card.Body>
              <Card.Footer
                className="p-0 "
                as={"button"}
                onClick={(e) => {
                  console.log(true);
                }}
              >
                <p className="my-auto py-2 text-white">
                  See Chart{" "}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    height="24"
                    viewBox="0 -960 960 960"
                    width="24"
                    className="pb-1"
                  >
                    <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
                  </svg>
                </p>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Row>
    </Fragment>
  );
};

export default Landing;
