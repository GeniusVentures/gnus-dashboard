// import node module libraries
import { Fragment, useEffect } from "react";

// import layouts
import NavbarDefault from "../layouts/navbars/NavbarDefault";
// import Footer from "layouts/footers/Footer";

const DefaultLayout = (props) => {
  useEffect(() => {
    document.body.className = "bg-gray-100";
  }, []);
  return (
    <Fragment>
      <NavbarDefault />
      <main>{props.children}</main>
      {/* <Footer /> */}
    </Fragment>
  );
};

export default DefaultLayout;
