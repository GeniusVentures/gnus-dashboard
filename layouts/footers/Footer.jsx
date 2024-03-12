// import node module libraries
import { Fragment, useState } from "react";
import Link from "next/link";
import { Row, Col, Image, ListGroup } from "react-bootstrap";

const Footer = () => {
  const [year] = useState(new Date().getFullYear());

  return (
    <Fragment>
      <div
        style={{
          backgroundColor: "#0c1959b3",
          height: "100px",
          alignItems: "flex-end",
          backdropFilter: "blur(5px)",
          position: "absolute",
          width: "100%",
        }}
        className="d-flex justify-content-between text-white mt-10 px-16"
      >
        <p>© GNUS.AI {year}</p>
        <p>v0.0.1</p>
      </div>
    </Fragment>
  );
};

export default Footer;
