import { Fragment, useEffect, useState } from "react";
import { Button, Row } from "react-bootstrap";
import NetworkInfo from "sub-components/dashboard/NetworkSummary";
import ResourcesLeased from "sub-components/dashboard/ResourcesLeased";
import NetworkCapacity from "sub-components/dashboard/NetworkCapacity";
import SpentAssets from "sub-components/dashboard/SpentAssets";
import { useRouter } from "next/router";
import lastUpdate from "../../functions/time/lastUpdate";

const Analytics = () => {
  const router = useRouter();
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    setUpdated(lastUpdate());
  }, []);

  return (
    <Fragment>
      <Row className="justify-content-center mx-5 mx-lg-10">
        <div className="text-center mt-5">
          <h1
            className="display-5 text-white"
            style={{ fontFamily: "HKModularBold" }}
          >
            GNUS.AI Testnet Dashboard
          </h1>
          <p className="text-white pb-2">Last updated: {updated}</p>
        </div>

        <Row className="border-bottom justify-content-center py-5">
          <NetworkInfo />
        </Row>
        <Row className="border-bottom m-0 mt-3 justify-content-center py-5">
          <ResourcesLeased />
        </Row>
        <Row className="border-bottom m-0 mt-3 justify-content-center py-5">
          <NetworkCapacity />
        </Row>
        <Row className="m-0 mt-3 justify-content-center py-5">
          <SpentAssets />
        </Row>
        <Row className="justify-content-center mt-5">
          <Button
            onClick={() => router.push("/analytics")}
            style={{ width: "350px" }}
            className="btn btn-gnus fs-3"
          >
            See Block Explorer
          </Button>
        </Row>
      </Row>
    </Fragment>
  );
};

export default Analytics;
