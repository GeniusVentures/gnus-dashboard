import { Fragment, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, Row } from "react-bootstrap";
import BlockTransactions from "sub-components/tables/BlockTransactions";
import lastUpdate from "../../functions/time/lastUpdate";
import Link from "next/link";

const Transaction: React.FC = () => {
  const [updated, setUpdated] = useState(null);
  const router = useRouter();
  const { transaction } = router.query;
  const [transInfo, setTransInfo] = useState({
    status: "Success",
    time: "Test",
    hash: "0x7d9a4ebf0447e0a4908f16ff9c6b7b1f7009838f8d7b74dc81a9c1f9d6b073a2",
    height: "651",
    signer: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
  });

  useEffect(() => {
    setUpdated(lastUpdate());
  }, []);

  return (
    <Fragment>
      <Row className="justify-content-center mx-3 mx-lg-15">
        <h1
          className="display-4 text-white mt-5 mb-0"
          style={{ fontFamily: "HKModularBold" }}>
          Transaction Details
        </h1>
        <p className="text-white pb-2">Last updated: {updated}</p>

        <Card
          style={{ backdropFilter: "blur(5px)" }}
          className="p-5 px-lg-10 bg-gradient-gnus text-white">
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="mb-0">Hash</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{transaction}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="mb-0">Status</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{transInfo?.status}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="mb-0">Height</p>
            </div>
            <div className="fs-3">
              <p className="text-white">
                <Link href={`/block/${transInfo?.height}`}>
                  {transInfo?.height}
                </Link>
              </p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">Time</p>
            </div>
            <div className="fs-3">
              <p className="text-white">{transInfo?.time}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">Fee</p>
            </div>
            {/* <div className="fs-3">
              <p className="text-white">{transInfo?.fee || "0"}</p>
            </div> */}
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">{"Gas (used/wanted)"}</p>
            </div>
            {/* <div className="fs-3">
              <p className="text-white">{transInfo?.gas || "0"}</p>
            </div> */}
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">Signer</p>
            </div>
            <div className="fs-3">
              <p className="text-white">
                <Link href={`/address/${transInfo.signer}`}>
                  {transInfo?.signer}
                </Link>
              </p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className=" mb-0">Memo</p>
            </div>
            {/* <div className="fs-3">
              <p className="text-white mb-0">{transInfo?.memo}</p>
            </div> */}
          </div>
        </Card>
      </Row>
    </Fragment>
  );
};
export default Transaction;
