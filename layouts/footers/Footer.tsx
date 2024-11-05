import Link from "next/link";
import { Fragment, useState, MouseEvent } from "react";
import { Row, Col, Image, ListGroup, Modal, Button } from "react-bootstrap";
import Socials from "sub-components/socials/Socials";

const Footer: React.FC = () => {
  const [year] = useState(new Date().getFullYear());
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <Fragment>
      <div
        className="pt-lg-10 pt-5 footer bg-black"
        style={{ boxShadow: "0 -5px 10px rgba(54, 237, 181, .3)" }}>
        <Row className="justify-content-center mx-0 mx-lg-10">
          <Col lg={4} md={6} sm={7} className="text-center">
            <div className="pb-4 pb-lg-4">
              <Link href="/">
                <Image
                  width="200"
                  src={"images/logo/new-gnus-logo.png"}
                  alt="Funding Chain Logo"
                />
              </Link>
              <div className="mt-3 mb-0">
                <div className="fs-4">
                  <h3 className="mb-0 text-secondary">Join Our Community</h3>
                  <Socials si="md" gap={5} />
                </div>
              </div>
            </div>
          </Col>
          <Col
            className="d-none d-lg-block"
            lg={{ span: 3, offset: 1 }}
            md={3}
            sm={6}>
            <div className="mb-4">
              <Link href="#">
                <h3 className="fw-bold mb-3 text-secondary">About</h3>
              </Link>
              <ListGroup
                as="ul"
                bsPrefix="list-unstyled"
                className="nav nav-footer flex-column nav-x-0">
                <ListGroup.Item as="li">
                  <Link href="#" className="nav-link">
                    Features
                  </Link>
                </ListGroup.Item>
                <ListGroup.Item as="li">
                  <Link href="#" className="nav-link">
                    Partners
                  </Link>
                </ListGroup.Item>
                <ListGroup.Item as="li">
                  <Link href="/frequently-asked-questions" className="nav-link">
                    FAQ
                  </Link>
                </ListGroup.Item>
                <ListGroup.Item as="li">
                  <Link
                    href=""
                    onClick={() => {
                      setShowPrivacy(true);
                    }}
                    className="nav-link">
                    Privacy Policy
                  </Link>
                </ListGroup.Item>
              </ListGroup>
            </div>
          </Col>

          <Col className="d-none d-lg-block ms-n5" lg={3} md={12} sm={12}>
            <div className="text-white">
              <Link href="/contact-us">
                <h3 className="fw-bold mb-3 text-secondary">Get in Touch</h3>
              </Link>
              <p className="mb-0">GNUS.AI</p>
              <p className="mb-0">WB Corporate Services (Cayman) Ltd.</p>
              <p className="mb-0">PO Box 2775, 71 Fort Street, 3rd Floor</p>
              <p className="">Grand Cayman, KY1-1111, Cayman Islands</p>
              <p className="text-nowrap">
                Email:{" "}
                <Link href="mailto:support@fundingchain.io">
                  support@gnus.ai
                </Link>
              </p>
            </div>
          </Col>
          <p className="text-white text-center">
            {`GNUS.AI © ${year}. All Rights Reserved.`}
          </p>
        </Row>
        <Row className="justify-content-center g-0 d-block d-lg-none">
          <Col
            lg={12}
            md={12}
            sm={12}
            xs={12}
            className="d-flex justify-content-center">
            <nav className="nav nav-footer">
              <Link href="#" className="nav-link px-2 px-sm-2 px-md-3">
                Features
              </Link>

              <Link href="#" className="nav-link px-2 px-sm-2 px-md-3">
                About
              </Link>
              <Link
                href=""
                className="nav-link px-2 px-sm-2 px-md-3"
                onClick={() => {
                  setShowPrivacy(true);
                }}>
                Privacy
              </Link>
              <Link
                href="/frequently-asked-questions"
                className="nav-link px-2 px-sm-2 px-md-3">
                FAQ
              </Link>
              <Link
                href="/contact-us"
                className="nav-link px-2 px-sm-2 px-md-3">
                Contact
              </Link>
            </nav>
          </Col>
        </Row>
      </div>
      <Modal show={showPrivacy} onHide={() => setShowPrivacy(false)} centered>
        <Modal.Header className="text-white display-6">
          Privacy Policy
          <span
            className="fe fe-plus modal-close"
            onClick={() => setShowPrivacy(false)}
          />
        </Modal.Header>
        <Modal.Body>{/* Add your privacy policy content here */}</Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default Footer;
