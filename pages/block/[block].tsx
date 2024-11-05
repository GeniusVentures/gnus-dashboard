import { Fragment, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, Row } from "react-bootstrap";
import BlockTransactions from "sub-components/tables/BlockTransactions";
import lastUpdate from "../../functions/time/lastUpdate";
import StaticVideoBG from "sub-components/videos/StaticVideoBG";

const Blocks: React.FC = () => {
  const [updated, setUpdated] = useState(null);
  const router = useRouter();
  const [width, setWidth] = useState<number>(0);
  const { block } = router.query;
  const [blockInfo, setBlockInfo] = useState({
    proposer: "test",
    time: "Test",
    hash: "0xavs615gv1a6d5fv1a65v1afd57gsd6v54as65v1",
    transactions: [],
    gas: "",
  });

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setUpdated(lastUpdate());
  }, []);

  return (
    <Fragment>
      <StaticVideoBG video="https://orange-generous-tern-256.mypinata.cloud/ipfs/QmaqTgr2wVEC92ByksgtcKobKYYetJLENMJmBUPzG7RBFA" />
      <Row className="justify-content-center mx-3 mx-lg-15 pt-20 pb-5">
        {width >= 1200 && (
          <div>
            <h1 className="display-4 text-white">Details for Block #{block}</h1>
            <p className="text-white pb-2">Last updated: {updated}</p>
          </div>
        )}
        {width >= 900 && width < 1200 && (
          <div>
            <h1 className="display-4 text-white">Details for Block #{block}</h1>
            <p className="text-white pb-2">Last updated: {updated}</p>
          </div>
        )}
        {width < 900 && (
          <div>
            <h1 className="display-5 text-white">Details for Block #{block}</h1>
            <p className="text-white fs-5 pb-2">Last updated: {updated}</p>
          </div>
        )}

        <Card className="p-5 px-lg-10 text-white">
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">Height</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{block}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">Proposer</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{blockInfo?.proposer}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">Block Time</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{blockInfo?.time}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">Block Hash</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{blockInfo?.hash}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0"># of Transactions</p>
            </div>
            <div className="fs-3">
              <p className="text-white">
                {blockInfo?.transactions?.length || 0}
              </p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">Gas Used</p>
            </div>
            <div className="fs-3">
              <p className="text-white mb-0">{blockInfo?.gas || 0}</p>
            </div>
          </div>
        </Card>
      </Row>
      <Row className="justify-content-center mx-3 mx-lg-15 pb-20">
        <Card className="p-5 px-lg-10 text-white">
          <h2 className="text-white">Transactions</h2>
          <BlockTransactions transData={blockInfo?.transactions} />
        </Card>
      </Row>
    </Fragment>
  );
};
export default Blocks;
