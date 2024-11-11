import { Fragment, useEffect, useState } from "react";
import { Button, Row } from "react-bootstrap";
import BlockchainInfo from "sub-components/dashboard/BlockchainInfo";
import { useRouter } from "next/router";
import lastUpdate from "../functions/time/lastUpdate";
import StaticVideoBG from "sub-components/videos/StaticVideoBG";

const Landing: React.FC = () => {
  const router = useRouter();
  const [updated, setUpdated] = useState(null);
  const [width, setWidth] = useState<number>(0);
  const [show, setShow] = useState<boolean>(false);

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

  useEffect(() => {
    if (show) {
      setShow(false);
      setTimeout(() => {
        setShow(true);
      }, 500);
    }
  }, [width]);

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
          <Row className="justify-content-center mx-3 mx-lg-10">
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

            <Row className="px-0">
              <BlockchainInfo />
            </Row>
          </Row>
          <Row className="justify-content-center mt-5">
            <div style={{ width: "250px" }} className="mx-auto mx-sm-0">
              <Button
                onClick={() => router.push("/analytics")}
                style={{
                  backgroundColor: " #00000000",
                }}
                className="btn-gnus py-2 w-100">
                View Analytics
              </Button>
            </div>
          </Row>
        </div>
      </div>
    </Fragment>
  );
};

export default Landing;
