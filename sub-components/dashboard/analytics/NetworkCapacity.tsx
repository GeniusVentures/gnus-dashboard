import React, { Fragment, useState } from "react";
import { Row, Col, Card, Modal } from "react-bootstrap";
import StatRightChart from "widgets/stats/StatRightChart";

const NetworkCapacity: React.FC = () => {
  const [modal, setModal] = useState<boolean>(false); // State to handle modal visibility

  const handleModalOpen = () => setModal(true);
  const handleModalClose = () => setModal(false);

  return (
    <Fragment>
      <Row className="gap-3">
        <h2 className="display-7 text-white">Network Capacity</h2>
      </Row>
      <Row className="d-flex justify-content-center gap-3">
        <Col style={{ maxWidth: "300px", minWidth: "150px" }} className="mb-4">
          <Card className="h-100">
            <StatRightChart
              title="Active Nodes"
              chartName="ActiveNodes"
              series={[{ data: [37, 35, 32, 31, 32, 35, 40, 42] }]}
              value={43}
            />
            <Card.Footer
              style={{ cursor: "pointer" }}
              className="p-0 text-center"
              onClick={handleModalOpen}>
              <p className="my-auto py-2 text-white fs-4">
                See Chart{" "}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  height="24"
                  viewBox="0 -960 960 960"
                  width="24"
                  className="pb-1">
                  <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
                </svg>
              </p>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      <Modal show={modal} onHide={handleModalClose}>
        <Modal.Header closeButton></Modal.Header>
        <Modal.Body></Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default NetworkCapacity;
