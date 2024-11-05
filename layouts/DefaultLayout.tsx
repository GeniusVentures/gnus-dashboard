import React, { Fragment, useEffect, useState } from "react";
import NavbarDefault from "./navbars/NavbarDefault";
import Footer from "./footers/Footer";
import { Form } from "react-bootstrap";
import ToggleSwitch from "../widgets/forms/ToggleSwitch";

const DefaultLayout = (props) => {
  useEffect(() => {
    document.body.className = "bg-black";
  }, []);
  return (
    <Fragment>
      <NavbarDefault />
      <div
        style={{
          position: "fixed",
          top: "60px",
          right: "10px",
          zIndex: "500",
        }}>
        <ToggleSwitch label="Network" />
      </div>

      <main>{props.children}</main>
      <Footer />
    </Fragment>
  );
};

export default DefaultLayout;
