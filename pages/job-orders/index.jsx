import { Fragment, useEffect, useState } from "react";
import { Row } from "react-bootstrap";
import OrderForm from "../../sub-components/job-order/OrderForm";
const JobOrders = () => {
  return (
    <Fragment>
      <div style={{ minHeight: "80vh" }} className="py-3">
        <Row className="justify-content-center mx-3 mx-lg-10">
          <div className="text-center mt-5">
            <h1
              className="display-5 text-white"
              style={{ fontFamily: "HKModularBold" }}
            >
              GNUS.AI Job Order Form
            </h1>
          </div>
          <OrderForm />
        </Row>
      </div>
    </Fragment>
  );
};

export default JobOrders;
