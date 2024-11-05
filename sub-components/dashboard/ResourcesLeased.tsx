import { Row, Col, Card, Modal } from "react-bootstrap";
import { Fragment, useState } from "react";

const ResourcesLeased = () => {
  const [modal, setModal] = useState<boolean>(false);
  // const [displayer, setDisplayer] = useState(null);
  // const [chart, setChart] = useState(null);

  return (
    <Fragment>
      <Row>
        <h2 className="display-7 text-white">Resources Leased</h2>
      </Row>
      <Row className="d-flex justify-content-center gap-3">
        <Col style={{ maxWidth: "300px", minWidth: "150px" }} className="mb-4">
          <Card className="h-100">
            <Card.Body className="text-white">test</Card.Body>
            <Card.Footer
              style={{ cursor: "pointer" }}
              className="p-0 text-center"
              onClick={(e) => {
                setModal(true);
              }}>
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
        <Col style={{ maxWidth: "300px", minWidth: "150px" }} className="mb-4">
          <Card className="h-100">
            <Card.Body className="text-white">test</Card.Body>
            <Card.Footer
              style={{ cursor: "pointer" }}
              className="p-0 text-center"
              onClick={(e) => {
                setModal(true);
              }}>
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
        <Col style={{ maxWidth: "300px", minWidth: "150px" }} className="mb-4">
          <Card className="h-100">
            <Card.Body className="text-white">test</Card.Body>
            <Card.Footer
              style={{ cursor: "pointer" }}
              className="p-0 text-center"
              onClick={(e) => {
                setModal(true);
              }}>
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
        <Col style={{ maxWidth: "300px", minWidth: "150px" }} className="mb-4">
          <Card className="h-100">
            <Card.Body className="text-white">test</Card.Body>
            <Card.Footer
              style={{ cursor: "pointer" }}
              className="p-0 text-center"
              onClick={(e) => {
                setModal(true);
              }}>
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
        <Col style={{ maxWidth: "300px", minWidth: "150px" }} className="mb-4">
          <Card className="h-100">
            <Card.Body className="text-white">test</Card.Body>
            <Card.Footer
              style={{ cursor: "pointer" }}
              className="p-0 text-center"
              onClick={(e) => {
                setModal(true);
              }}>
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
      <Modal show={modal}>
        <Modal.Header
          closeButton
          onHide={() => {
            setModal(false);
          }}></Modal.Header>
        <Modal.Body></Modal.Body>
      </Modal>
    </Fragment>
  );
};
export default ResourcesLeased;
