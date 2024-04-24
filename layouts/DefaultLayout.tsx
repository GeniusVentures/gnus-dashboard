import React, { Fragment, useEffect } from "react";
import NavbarDefault from "./navbars/NavbarDefault";
import Footer from "./footers/Footer";
import { Image } from "react-bootstrap";

const DefaultLayout = (props) => {
  useEffect(() => {
    document.body.className = "bg-primary";
  }, []);
  return (
    <Fragment>
      <div className="image-background">
        <Image
          src="/images/background/brain-still.png"
          alt="Background image of a brain"
        />
      </div>
      <NavbarDefault />
      <main style={{ minHeight: "70vh" }}>{props.children}</main>
      <Footer />
    </Fragment>
  );
};

export default DefaultLayout;
