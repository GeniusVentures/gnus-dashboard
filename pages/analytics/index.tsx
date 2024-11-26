import { Fragment, useEffect, useState } from "react";
import { Button, Row } from "react-bootstrap";
import NetworkInfo from "sub-components/dashboard/analytics/NetworkSummary";
import ResourcesLeased from "sub-components/dashboard/analytics/ResourcesLeased";
import NetworkCapacity from "sub-components/dashboard/analytics/NetworkCapacity";
import SpentAssets from "sub-components/dashboard/analytics/SpentAssets";
import { useRouter } from "next/router";
import lastUpdate from "../../functions/time/lastUpdate";

const Analytics: React.FC = () => {
  const router = useRouter();
  const [updated, setUpdated] = useState(null);
  const [width, setWidth] = useState<number>(0);

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
      <div>
        <div
          className="w-100 fs-3 px-3 py-15"
          style={{
            minHeight: "100vh",
            alignContent: "center",
            height: "100%",
            backgroundColor: "#00000060",
          }}>
          <Row className="justify-content-center mx-lg-10">
            {width >= 1200 && (
              <div className="text-center mt-5">
                <h1 className="display-3 text-white">Testnet Dashboard</h1>
                <p className="text-white pb-5">Last updated: {updated}</p>
              </div>
            )}
            {width >= 900 && width < 1200 && (
              <div className="text-center mt-5">
                <h1 className="display-4 text-white">Testnet Dashboard</h1>
                <p className="text-white pb-5">Last updated: {updated}</p>
              </div>
            )}
            {width < 900 && (
              <div className="text-center mt-5">
                <h1 className="display-5 text-white">Testnet Dashboard</h1>
                <p className="text-white fs-5 pb-5">Last updated: {updated}</p>
              </div>
            )}
            <Row
              className="border-bottom justify-content-center pb-5"
              style={{ maxWidth: "1570px" }}>
              <NetworkInfo />
            </Row>
            <Row
              className="border-bottom m-0 mt-3 justify-content-center py-5"
              style={{ maxWidth: "1570px" }}>
              <ResourcesLeased />
            </Row>
            <Row
              className="border-bottom m-0 mt-3 justify-content-center py-5"
              style={{ maxWidth: "1570px" }}>
              <NetworkCapacity />
            </Row>
            <Row
              className="m-0 mt-3 justify-content-center py-5"
              style={{ maxWidth: "1570px" }}>
              <SpentAssets />
            </Row>
            <Row className="justify-content-center mt-5">
              <Button
                onClick={() => router.push("/analytics")}
                style={{ width: "350px" }}
                className="btn btn-gnus fs-3">
                See Block Explorer
              </Button>
            </Row>
          </Row>
        </div>
      </div>
    </Fragment>
  );
};

export default Analytics;
