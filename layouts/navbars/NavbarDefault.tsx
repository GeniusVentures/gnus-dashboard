// import node module libraries
import React, { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { Image, Navbar, Nav, Container } from "react-bootstrap";
import NavDropdownMain from "../../sub-components/navbar/NavDropdownMain";
import NavbarDefaultRoutes from "../../data/navbars/navbarRoutes";
import Socials from "../../sub-components/socials/Socials";
import Search from "../../sub-components/navbar/Search";
import ToggleSwitch from "widgets/forms/ToggleSwitch";
import Price from "sub-components/navbar/Price";

const NavbarDefault: React.FC = () => {
  const [expandedMenu, setExpandedMenu] = useState<boolean>(false);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <Fragment>
      <Navbar
        onToggle={(collapsed) => setExpandedMenu(collapsed)}
        collapseOnSelect
        expanded={expandedMenu}
        expand="lg"
        fixed="top"
        style={{ overflow: "hidden" }}
        className={`w-100 navbar ps-1 pe-1 navbar-default py-1 bg-trans`}>
        <Container fluid className="px-0 px-lg-1">
          <Navbar.Brand
            className="py-0"
            as={Link}
            href="/"
            onClick={() => setExpandedMenu(false)}>
            <div className="d-flex align-items-center h-100 ps-2 py-1">
              <Image
                alt="GNUS.AI Logo"
                width={width >= 540 ? "190" : "160"}
                src="images/logo/new-gnus-logo.png"
              />
            </div>
          </Navbar.Brand>
          <Nav className="navbar-nav navbar-right-wrap nav-top-wrap ms-auto d-lg-none">
            <ToggleSwitch label="Network" />
          </Nav>

          <Navbar.Toggle aria-controls="basic-navbar-nav" className="me-2">
            <span className="icon-bar top-bar mt-0"></span>
            <span className="icon-bar middle-bar"></span>
            <span className="icon-bar bottom-bar"></span>
          </Navbar.Toggle>

          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-3 me-4">
              {NavbarDefaultRoutes.map((item, index) => {
                if (item.children === undefined) {
                  return (
                    <Nav.Link
                      className="nladj text-primary"
                      key={index}
                      as={Link}
                      href={item.link}>
                      {item.menuitem}
                    </Nav.Link>
                  );
                } else {
                  return <NavDropdownMain href="" item={item} key={index} />;
                }
              })}
            </Nav>
            <Nav className="mx-auto">
              <Search />
            </Nav>
            <Nav className="mx-auto">
              <Price />
            </Nav>
            <Nav className="navbar-nav navbar-right-wrap nav-top-wrap d-none d-lg-block">
              <ToggleSwitch label="Network" />
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </Fragment>
  );
};

export default NavbarDefault;
