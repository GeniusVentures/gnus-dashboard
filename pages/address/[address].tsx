import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Card, Row } from "react-bootstrap";
import BlockTransactions from "sub-components/tables/BlockTransactions";
import lastUpdate from "../../functions/time/lastUpdate";

const Address: React.FC = () => {
  const [updated, setUpdated] = useState(null);
  const router = useRouter();
  const { address } = router.query;
  const [addressInfo, setAddressInfo]: any = useState({
    balance: "19.795279",
    time: "Test",
    hash: "0xavs615gv1a6d5fv1a65v1afd57gsd6v54as65v1",
    transactions: [],
  });
  const [gnusUSD, setGNUSUsd] = useState("102.54");
  const [gnusUsdValue, setGnusUsdValue] = useState(null);

  useEffect(() => {
    setUpdated(lastUpdate());
  }, []);

  useEffect(() => {
    if (gnusUSD && addressInfo.balance) {
      setGnusUsdValue(
        (parseFloat(addressInfo.balance) * parseFloat(gnusUSD)).toFixed(2)
      );
    }
  }, [gnusUSD]);

  return (
    <Fragment>
      <Row className="justify-content-center mx-3 mx-lg-15 mb-10">
        <h1 className="display-4 text-white mt-lg-5 mb-0">Address Details</h1>
        <p className="text-white pb-2">Last updated: {updated}</p>

        <Card className="p-5 px-lg-10 blur text-white bg-gradient-gnus">
          <div className="d-block d-md-flex">
            <div className="fs-4 w-md-15">
              <p className="pt-1 mb-0">Address</p>
            </div>
            <div className="fs-3">
              <p className="mb-0">{address}</p>
            </div>
          </div>
          <div className="d-block d-md-flex">
            <div className="fs-2 w-md-15">
              <p className="mb-0">GNUS</p>
            </div>
            <div className="fs-2">
              <p className="text-white lh-2 mb-0">
                {addressInfo?.balance.split(".")[0]}
                <span className="fs-3">
                  .{addressInfo?.balance.split(".")[1]}
                  <span className="ms-3">{`($${gnusUsdValue})`}</span>
                </span>
              </p>
            </div>
          </div>
        </Card>
      </Row>
      <Row className="justify-content-center mx-3 mx-lg-15 mb-10">
        <Card className="p-5 px-lg-10 bg-gradient-gnus">
          <h2 className="fs-3 text-white">Transactions</h2>
          <BlockTransactions transData={addressInfo?.transactions} />
        </Card>
      </Row>
      <Row className="justify-content-center mx-3 mx-lg-15">
        <Card className="p-5 px-lg-10 bg-gradient-gnus">
          <h2 className="fs-3 text-white">Interchain Details</h2>
        </Card>
      </Row>
    </Fragment>
  );
};
export default Address;
