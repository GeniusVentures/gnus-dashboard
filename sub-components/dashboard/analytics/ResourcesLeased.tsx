import { Row, Col, Card, Modal } from "react-bootstrap";
import { Fragment, useState, useEffect } from "react";
import ApexCharts from "widgets/charts/ApexCharts";
import MapChart from "./MapChart";
import AggregateSpeed from "./AggregateSpeed";

const ResourcesLeased = () => {
  const [modal, setModal] = useState<boolean>(false);

  return (
    <Fragment>
      <Row className="justify-content-center gap-5 d-flex align-items-stretch px-0">
        <h2 className="display-7 text-white">Resources Leased</h2>
        <Col style={{ maxWidth: "600px", minWidth: "300px" }} className="mb-4">
          <AggregateSpeed setModal={setModal} />
        </Col>

        <Col style={{ maxWidth: "600px", minWidth: "300px" }} className="mb-4">
          <MapChart setModal={setModal} />
        </Col>
      </Row>
      <Modal show={modal}>
        <Modal.Header closeButton onHide={() => setModal(false)} />
        <Modal.Body>{/* Add any content for the modal here */}</Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default ResourcesLeased;
