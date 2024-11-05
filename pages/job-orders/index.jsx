import { Fragment, useEffect, useState } from "react";
import { Row } from "react-bootstrap";
import OrderForm from "../../sub-components/job-order/OrderForm";
const JobOrders = () => {
  return (
    <Fragment>
      <div
        style={{ minHeight: "100vh", backgroundColor: "#00000060" }}
        className="py-20">
        <Row className="justify-content-center mx-3 mx-lg-10">
          <div className="text-center mt-5">
            <h1
              className="display-5 text-white"
              style={{ fontFamily: "HKModularBold" }}>
              Processing Job Order Form
            </h1>
          </div>
          <OrderForm />
        </Row>
      </div>
    </Fragment>
  );
};

export default JobOrders;
