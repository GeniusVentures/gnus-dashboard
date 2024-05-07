import { Fragment, useEffect, useState } from "react";
import { Button, Row } from "react-bootstrap";
import BlockchainInfo from "sub-components/dashboard/BlockchainInfo";
import { useRouter } from "next/router";
import lastUpdate from "../functions/time/lastUpdate";
const Landing = () => {
  const router = useRouter();
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    setUpdated(lastUpdate());
  }, []);

  return (
    <Fragment>
      <div style={{ minHeight: "80vh" }} className="py-3">
        <Row className="justify-content-center mx-3 mx-lg-10">
          <div className="text-center mt-5">
            <h1
              className="display-5 text-white"
              style={{ fontFamily: "HKModularBold" }}
            >
              GNUS.AI Testnet Dashboard
            </h1>
            <p className="text-white pb-5">Last updated: {updated}</p>
          </div>
          <Row className="px-0">
            <BlockchainInfo />
          </Row>
        </Row>
        <Row className="justify-content-center mt-5">
          <Button
            onClick={() => router.push("/analytics")}
            style={{ width: "350px" }}
            className="btn btn-gnus fs-3"
          >
            View Analytics
          </Button>
        </Row>
      </div>
    </Fragment>
  );
};

export default Landing;
