// import node module libraries
import { Fragment, useState } from "react";
import Link from "next/link";
import { Row, Col, Image, ListGroup } from "react-bootstrap";

const Footer = () => {
  const [year] = useState(new Date().getFullYear());

  return (
    <Fragment>
      <div className="pt-lg-10 pt-5 footer bg-white">
        <Row className="justify-content-center pb-lg-10 mx-lg-10">
          <Col lg={3} md={6} sm={7} className="text-center">
            <div className="pb-4 pb-lg-4">
              <Link href="/">
                <Image
                  width="150"
                  src={"images/logo/funding-chain-logo.png"}
                  alt="Funding Chain Logo"
                />
              </Link>
              <div className="mt-4 mb-0">
                <p className="mb-0">Funding Chain is a subsidiary of </p>
                <a
                  href="https://www.decentralized-ventures.com"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Decentralized Ventures, LLC.
                </a>
                <p>{`© ${year}. All Rights Reserved.`}</p>
                <div className="fs-4 mt-4">
                  <a
                    href="https://www.facebook.com/fundingchain"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="me-3"
                  >
                    <Image
                      height={35}
                      src="images/socials/Facebook_Logo_Primary.png"
                      alt="Facebook Logo"
                    />
                    {/* <Icon path={mdiFacebook} size={1.75} /> */}
                  </a>
                  <a
                    href="https://x.com/fundingchain"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="me-3"
                  >
                    <Image
                      height={35}
                      src="images/socials/x-logo-black.png"
                      alt="X Logo"
                    />
                  </a>
                  <a
                    href="https://www.instagram.com/fundingchain/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="me-3"
                  >
                    <Image
                      height={35}
                      src="images/socials/Instagram_Glyph_Gradient.png"
                      alt="Instagram Logo"
                    />
                  </a>
                  <a
                    href="https://www.tiktok.com/@fundingchain"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="me-3"
                  >
                    <Image
                      height={35}
                      src="images/socials/TikTok-logo.png"
                      alt="Tiktok Logo"
                    />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/funding-chain"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Image
                      height={35}
                      src="images/socials/Li-In-Bug.png"
                      alt="Linkedin Logo"
                    />
                  </a>
                </div>
              </div>
            </div>
          </Col>
          <Col
            className="d-none d-lg-block"
            lg={{ span: 2, offset: 1 }}
            md={3}
            sm={6}
          >
            <div className="mb-4">
              <h3 className="fw-bold mb-3">About</h3>
              <ListGroup
                as="ul"
                bsPrefix="list-unstyled"
                className="nav nav-footer flex-column nav-x-0"
              >
                <ListGroup.Item as="li" bsPrefix=" ">
                  <Link
                    href="/help/frequently-asked-questions"
                    className="nav-link"
                  >
                    FAQ’s
                  </Link>
                </ListGroup.Item>
                <ListGroup.Item as="li" bsPrefix=" ">
                  <Link href="/help/contact-us" className="nav-link">
                    Contact Us
                  </Link>
                </ListGroup.Item>
                <ListGroup.Item as="li" bsPrefix=" ">
                  <Link
                    href=""
                    onClick={() => {
                      setTerms(true);
                    }}
                    className="nav-link"
                  >
                    Terms of Use
                  </Link>
                </ListGroup.Item>{" "}
                <ListGroup.Item as="li" bsPrefix=" ">
                  <Link
                    href=""
                    onClick={() => {
                      setPrivacy(true);
                    }}
                    className="nav-link"
                  >
                    Privacy Policy
                  </Link>
                </ListGroup.Item>{" "}
                <ListGroup.Item as="li" bsPrefix=" ">
                  <Link
                    href=""
                    onClick={() => {
                      setFees(true);
                    }}
                    className="nav-link"
                  >
                    Fees
                  </Link>
                </ListGroup.Item>{" "}
              </ListGroup>
            </div>
          </Col>
          <Col className="d-none d-lg-block" lg={4} md={3} sm={6}>
            <div className="mb-4">
              <Link
                href="/chain-finder/                                                                                                                                                                                                                                qa"
                className="nav-link"
              >
                <h3 className="fw-bold mb-3">Funding Chains</h3>
              </Link>
              <Row>
                <Col>
                  <ListGroup
                    as="ul"
                    bsPrefix="list-unstyled"
                    className="nav nav-footer flex-column nav-x-0"
                  >
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link
                        href="/chain-finder/startups-and-business"
                        className="nav-link"
                      >
                        Startups and Business
                      </Link>
                    </ListGroup.Item>
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link
                        href="/chain-finder/social-causes"
                        className="nav-link"
                      >
                        Social Causes
                      </Link>
                    </ListGroup.Item>
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link
                        href="/chain-finder/emergencies"
                        className="nav-link"
                      >
                        Emergencies
                      </Link>
                    </ListGroup.Item>
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link href="/chain-finder/medical" className="nav-link">
                        Medical
                      </Link>
                    </ListGroup.Item>
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link
                        href="/chain-finder/film-and-arts"
                        className="nav-link"
                      >
                        Film and Arts
                      </Link>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                <Col>
                  <ListGroup
                    as="ul"
                    bsPrefix="list-unstyled"
                    className="nav nav-footer flex-column nav-x-0"
                  >
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link href="/chain-finder/spiritual" className="nav-link">
                        Spiritual
                      </Link>
                    </ListGroup.Item>
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link href="/chain-finder/events" className="nav-link">
                        Events
                      </Link>
                    </ListGroup.Item>
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link href="/chain-finder/legal" className="nav-link">
                        Legal
                      </Link>
                    </ListGroup.Item>
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link href="/chain-finder/political" className="nav-link">
                        Political
                      </Link>
                    </ListGroup.Item>
                    <ListGroup.Item as="li" bsPrefix=" ">
                      <Link href="/chain-finder/other" className="nav-link">
                        Other
                      </Link>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </Row>
            </div>
          </Col>

          <Col className="d-none d-lg-block ms-n5" lg={2} md={12} sm={12}>
            {/* contact info */}
            <div>
              <h3 className="fw-bold mb-3">Get in Touch</h3>
              <p className="mb-0">Decentralized Ventures</p>
              <p className="mb-0">Attn: Funding Chain</p>
              <p className="mb-0">P.O. Box 141</p>
              <p>Powhatan, VA 23139</p>
              <p className="text-nowrap">
                Email:{" "}
                <Link href="mailto:support@fundingchain.io">
                  support@fundingchain.io
                </Link>
              </p>
            </div>
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default Footer;
