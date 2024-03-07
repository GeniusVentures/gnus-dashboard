import { Fragment, useState } from "react";
import Link from "next/link";
import { Image, Navbar, Nav, Container } from "react-bootstrap";
import NavDropdownMain from "../../sub-components/navbar/NavDropdownMain";
import NavbarDefaultRoutes from "../../data/navbars/navbarRoutes";
import Socials from "../../sub-components/socials/Socials";
// import DarkLightMode from "layouts/DarkLightMode";

const NavbarDefault = ({ stSetter, headerstyle }) => {
  const [expandedMenu, setExpandedMenu] = useState(false);

  return (
    <Fragment>
      <Navbar
        onToggle={(collapsed) => setExpandedMenu(collapsed)}
        expanded={expandedMenu}
        expand="lg"
        className={`navbar p-2 bg-primary`}
      >
        <Container fluid className="px-0">
          <Navbar.Brand as={Link} href="/">
            <Image
              alt="GNUS.AI Logo"
              width="175"
              className="my-n7"
              src="../../images/logo/gnus-logo.png"
            />
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="basic-navbar-nav" className="bg-white">
            <span className="icon-bar top-bar mt-0"></span>
            <span className="icon-bar middle-bar"></span>
            <span className="icon-bar bottom-bar"></span>
          </Navbar.Toggle>
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-3">
              {NavbarDefaultRoutes.map((item, index) => {
                if (item.children === undefined) {
                  return (
                    <Nav.Link
                      className="text-white"
                      key={index}
                      as={Link}
                      href={item.link}
                    >
                      {item.menuitem}
                    </Nav.Link>
                  );
                } else {
                  return (
                    <NavDropdownMain
                      href=""
                      item={item}
                      key={index}
                      onClick={(value) => setExpandedMenu(value)}
                    />
                  );
                }
              })}
            </Nav>
            <Nav className="navbar-nav navbar-right-wrap ms-auto d-flex nav-top-wrap">
              <Socials />
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </Fragment>
  );
};

export default NavbarDefault;
