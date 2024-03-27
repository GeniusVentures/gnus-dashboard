import { Fragment, useEffect, useState } from "react";
import { Button, Row } from "react-bootstrap";
import BlockchainInfo from "sub-components/dashboard/BlockchainInfo";
import { useRouter } from "next/router";
import axios from "axios";
import createNode from "functions/ipfs/createNode";

const Landing = () => {
  const router = useRouter();
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    updateDate();
    // startLibp2p();
    createNode();
  }, []);

  // const startLibp2p = () => {
  //   axios.get("/api/libp2p/startLibp2p").then((res) => {
  //     console.log(res);
  //   });
  // };

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
          <h1 className="display-5 text-white">GNUS.AI Testnet Dashboard</h1>
          <p className="text-white pb-2">Last updated: {updated}</p>
        </div>
        <Row className="px-0">
          <BlockchainInfo />
        </Row>
      </Row>
      <Row className="justify-content-center mt-5">
        <Button
          onClick={() => router.push("/analytics")}
          style={{ width: "300px" }}
          className="btn btn-trans fs-3"
        >
          See Analytics
        </Button>
      </Row>
    </Fragment>
  );
};

export default Landing;
