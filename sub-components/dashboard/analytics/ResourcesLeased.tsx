import { Row, Col, Card, Modal } from "react-bootstrap";
import { Fragment, useState } from "react";
import MapChart from "./MapChart";
import DeviceMix from "./DeviceMix";

const ResourcesLeased: React.FC = () => {
  const [modal, setModal] = useState<boolean>(false);

  return (
    <Fragment>
      <Row className="justify-content-center gap-5 d-flex align-items-stretch px-0">
        <h2 className="display-7 text-white">Resources Leased</h2>
        <Col style={{ maxWidth: "600px", minWidth: "300px" }} className="mb-4">
          <DeviceMix setModal={setModal} />
        </Col>

        <Col style={{ maxWidth: "600px", minWidth: "300px" }} className="mb-4">
          <MapChart setModal={setModal} />
        </Col>
      </Row>
      <Modal show={modal} onHide={() => setModal(false)}>
        <Modal.Header closeButton />
        <Modal.Body>{/* Add any content for the modal here */}</Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default ResourcesLeased;
