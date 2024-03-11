import { Row, Col, Card, Modal } from "react-bootstrap";

const { Fragment, useState } = require("react");

const NetworkInfo = () => {
  const [modal, setModal] = useState(false);
  const [displayer, setDisplayer] = useState(null);
  const [chart, setChart] = useState(null);

  return (
    <Fragment>
      <Row>
        <h2 className="display-6 text-white">Network Information</h2>
      </Row>
      <Col xl={3} lg={3} md={4} sm={6} xs={11} className="mb-4">
        <Card>
          <Card.Body className="text-white">test</Card.Body>
          <Card.Footer
            className="p-0"
            as={"button"}
            onClick={(e) => {
              setModal(true);
            }}
          >
            <p className="my-auto py-2 text-white">
              See Chart{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                height="24"
                viewBox="0 -960 960 960"
                width="24"
                className="pb-1"
              >
                <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
              </svg>
            </p>
          </Card.Footer>
        </Card>
      </Col>
      <Col xl={3} lg={3} md={4} sm={6} xs={10} className="mb-4">
        <Card>
          <Card.Body></Card.Body>
          <Card.Footer
            className="p-0 "
            as={"button"}
            onClick={(e) => {
              setModal(true);
            }}
          >
            <p className="my-auto py-2 text-white">
              See Chart{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                height="24"
                viewBox="0 -960 960 960"
                width="24"
                className="pb-1"
              >
                <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
              </svg>
            </p>
          </Card.Footer>
        </Card>
      </Col>
      <Col xl={3} lg={3} md={4} sm={6} xs={10} className="mb-4">
        <Card>
          <Card.Body></Card.Body>
          <Card.Footer
            className="p-0 "
            as={"button"}
            onClick={(e) => {
              setModal(true);
            }}
          >
            <p className="my-auto py-2 text-white">
              See Chart{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                height="24"
                viewBox="0 -960 960 960"
                width="24"
                className="pb-1"
              >
                <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
              </svg>
            </p>
          </Card.Footer>
        </Card>
      </Col>
      <Col xl={3} lg={3} md={4} sm={6} xs={10} className="mb-4">
        <Card>
          <Card.Body></Card.Body>
          <Card.Footer
            className="p-0 "
            as={"button"}
            onClick={(e) => {
              setModal(true);
            }}
          >
            <p className="my-auto py-2 text-white">
              See Chart{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                height="24"
                viewBox="0 -960 960 960"
                width="24"
                className="pb-1"
              >
                <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
              </svg>
            </p>
          </Card.Footer>
        </Card>
      </Col>
      <Col xl={3} lg={3} md={4} sm={6} xs={10} className="mb-4">
        <Card>
          <Card.Body></Card.Body>
          <Card.Footer
            className="p-0 "
            as={"button"}
            onClick={(e) => {
              setModal(true);
            }}
          >
            <p className="my-auto py-2 text-white">
              See Chart{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                height="24"
                viewBox="0 -960 960 960"
                width="24"
                className="pb-1"
              >
                <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
              </svg>
            </p>
          </Card.Footer>
        </Card>
      </Col>
      <Col xl={3} lg={3} md={4} sm={6} xs={10} className="mb-4">
        <Card>
          <Card.Body></Card.Body>
          <Card.Footer
            className="p-0 "
            as={"button"}
            onClick={(e) => {
              setModal(true);
            }}
          >
            <p className="my-auto py-2 text-white">
              See Chart{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                height="24"
                viewBox="0 -960 960 960"
                width="24"
                className="pb-1"
              >
                <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
              </svg>
            </p>
          </Card.Footer>
        </Card>
      </Col>
      <Col xl={3} lg={3} md={4} sm={6} xs={10} className="mb-4">
        <Card>
          <Card.Body></Card.Body>
          <Card.Footer
            className="p-0 "
            as={"button"}
            onClick={(e) => {
              setModal(true);
            }}
          >
            <p className="my-auto py-2 text-white">
              See Chart{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                height="24"
                viewBox="0 -960 960 960"
                width="24"
                className="pb-1"
              >
                <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
              </svg>
            </p>
          </Card.Footer>
        </Card>
      </Col>
      <Col xl={3} lg={3} md={4} sm={6} xs={10} className="mb-4">
        <Card>
          <Card.Body></Card.Body>
          <Card.Footer
            className="p-0 "
            as={"button"}
            onClick={(e) => {
              setModal(true);
            }}
          >
            <p className="my-auto py-2 text-white">
              See Chart{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                height="24"
                viewBox="0 -960 960 960"
                width="24"
                className="pb-1"
              >
                <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z" />
              </svg>
            </p>
          </Card.Footer>
        </Card>
      </Col>
      <Modal show={modal}>
        <Modal.Header
          closeButton
          onHide={() => {
            setModal(false);
          }}
        ></Modal.Header>
        <Modal.Body></Modal.Body>
      </Modal>
    </Fragment>
  );
};
export default NetworkInfo;
