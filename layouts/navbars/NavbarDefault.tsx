import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Image, Nav, Navbar } from "react-bootstrap";
import NavbarDefaultRoutes from "../../data/navbars/navbarRoutes";
import IdentityHeader from "../../sub-components/wallet/IdentityHeader";

const NavbarDefault: React.FC = () => {
  const router = useRouter();
  return (
    <header className="border-bottom">
      <Navbar expand="lg" collapseOnSelect className="px-2 px-lg-3 flex-wrap gap-2">
        <Navbar.Brand as={Link} href="/" className="d-flex align-items-center gap-2 py-0">
          <Image alt="" width="32" height="32" src="images/logo/gnus-icon.png" />
          <span className="fw-semibold">GNUS Dashboard</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-menu">Menu</Navbar.Toggle>
        <Navbar.Collapse id="main-menu" className="flex-grow-0">
          <Nav className="me-lg-auto">
            {NavbarDefaultRoutes.map((item) => (
              <Nav.Link
                key={item.link}
                as={Link}
                href={item.link}
                active={router.pathname === item.link || router.pathname.startsWith(`${item.link}/`)}
              >
                {item.menuitem}
              </Nav.Link>
            ))}
          </Nav>
        </Navbar.Collapse>
        <div className="ms-lg-auto">
          <IdentityHeader />
        </div>
      </Navbar>
    </header>
  );
};

export default NavbarDefault;
