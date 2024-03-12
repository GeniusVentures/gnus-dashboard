import { Fragment, useState } from "react";
import { useRouter } from "next/router";
import { Card, Row } from "react-bootstrap";
import BlockTransactions from "sub-components/tables/BlockTransactions";
import transactions from "data/fake-data/transactions";

const Blocks = () => {
  const router = useRouter();
  const { block } = router.query;
  const [blockInfo, setBlockInfo] = useState({
    proposer: "test",
    time: "Test",
    hash: "0xavs615gv1a6d5fv1a65v1afd57gsd6v54as65v1",
    transactions: transactions,
  });

  return (
    <Fragment>
      <Row className="justify-content-center mx-3 mx-lg-15 mb-10">
        <h1 className="display-4 text-white mt-lg-5 mb-3">
          Details for Block #{block}
        </h1>
        <Card style={{ backdropFilter: "blur(5px)" }} className="p-5 px-lg-10">
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="text-muted mb-0">Height</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{block}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="text-muted mb-0">Proposer</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{blockInfo?.proposer}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="text-muted mb-0">Block Time</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{blockInfo?.time}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="text-muted mb-0">Block Hash</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{blockInfo?.hash}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="text-muted mb-0"># of Transactions</p>
            </div>
            <div className="fs-3">
              <p className="text-white">
                {blockInfo?.transactions?.length || 0}
              </p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="text-muted mb-0">Gas wanted / used</p>
            </div>
            <div className="fs-3">
              <p className="text-white mb-0">{blockInfo?.gas || 0}</p>
            </div>
          </div>
        </Card>
      </Row>
      <Row className="justify-content-center mx-3 mx-lg-15">
        <Card style={{ backdropFilter: "blur(5px)" }} className="p-5 px-lg-10">
          <h2 className="text-white">Transactions</h2>
          <BlockTransactions transData={blockInfo?.transactions} />
        </Card>
      </Row>
    </Fragment>
  );
};
export default Blocks;
