import { Fragment, useEffect, useState } from "react";
import { Button, Row } from "react-bootstrap";
import BlockchainInfo from "sub-components/dashboard/BlockchainInfo";
import { useRouter } from "next/router";
import axios from "axios";
// import createNode from "functions/ipfs/createNode";

const Landing = () => {
  const router = useRouter();
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
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
      <Row className="justify-content-center mx-3 mx-lg-10">
        <div className="text-center mt-5">
          <h1
            className="display-5 text-white"
            style={{ fontFamily: "HKModularBold" }}
          >
            GNUS.AI Testnet Dashboard
          </h1>
          <p className="text-white pb-2">Last updated: {updated}</p>
        </div>
        <Row className="px-0">
          <BlockchainInfo />
        </Row>
      </Row>
      <Row className="justify-content-center mt-5">
        <Button
          onClick={() => router.push("/analytics")}
          style={{ width: "350px", fontFamily: "HKModularBold" }}
          className="btn btn-trans fs-3 pb-2 py-3"
        >
          View Analytics
        </Button>
      </Row>
    </Fragment>
  );
};

export default Landing;
