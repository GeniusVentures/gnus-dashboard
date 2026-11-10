import React, { Fragment } from "react";
import NavbarDefault from "./navbars/NavbarDefault";
import Footer from "./footers/Footer";

const DefaultLayout = (props) => (
  <Fragment>
    <NavbarDefault />
    <main className="main-body">{props.children}</main>
    <Footer />
  </Fragment>
);

export default DefaultLayout;
