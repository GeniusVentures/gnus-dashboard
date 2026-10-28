import React, { Fragment, useEffect, useState } from "react";
import NavbarDefault from "./navbars/NavbarDefault";
import Footer from "./footers/Footer";
import IdentityHeader from "sub-components/wallet/IdentityHeader";
import StaticVideoBG from "sub-components/videos/StaticVideoBG";

const DefaultLayout = (props) => {
  useEffect(() => {
    document.body.className = "bg-black";
  }, []);
  return (
    <Fragment>
      <StaticVideoBG
        video={
          "https://orange-generous-tern-256.mypinata.cloud/ipfs/QmaqTgr2wVEC92ByksgtcKobKYYetJLENMJmBUPzG7RBFA"
        }
      />
      <NavbarDefault />
      <div className="pt-8">
        <IdentityHeader />
      </div>
      <main style={{ minHeight: "100vh" }}>{props.children}</main>
      <Footer />
    </Fragment>
  );
};

export default DefaultLayout;
