import { Fragment, useEffect } from "react";
import NavbarDefault from "../layouts/navbars/NavbarDefault";
import Footer from "layouts/footers/Footer";

const DefaultLayout = (props) => {
  useEffect(() => {
    document.body.className = "bg-primary";
  }, []);
  return (
    <Fragment>
      <div className="video-background">
        <video autoPlay loop muted>
          <source src="/videos/gnus-ai-background.mp4" type="video/mp4" />
        </video>
      </div>
      <NavbarDefault />
      <main style={{ minHeight: "70vh" }}>{props.children}</main>
      <Footer />
    </Fragment>
  );
};

export default DefaultLayout;
