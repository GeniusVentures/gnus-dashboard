// import node module libraries
import React, { Fragment, useState } from "react";
import Link from "next/link";
import { Image, Navbar, Nav, Container } from "react-bootstrap";
import NavDropdownMain from "../../sub-components/navbar/NavDropdownMain";
import NavbarDefaultRoutes from "../../data/navbars/navbarRoutes";
import Socials from "../../sub-components/socials/Socials";
import Search from "../../sub-components/navbar/Search";

const NavbarDefault = () => {
	const [expandedMenu, setExpandedMenu] = useState(false);

	return (
		<Fragment>
			<Navbar
				onToggle={(collapsed) => setExpandedMenu(collapsed)}
				expanded={expandedMenu}
				expand="lg"
				style={{
					backgroundColor: "white",
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					zIndex: 1000,
				}}
				className={`navbar p-2 blur`}>
				<Container fluid className="px-0">
					<Navbar.Brand as={Link} href="/">
						<Image
							alt="GNUS.AI Logo"
							height="50"
							src="../../images/logo/gnus-icon.png"
						/>
						<span
							className="ms-1 display-5 align-bottom"
							style={{
								fontFamily: "HKModularBold",
								color: "#2a2b31",
								letterSpacing: "-0.06rem",
							}}>
							GNUS.AI
						</span>
					</Navbar.Brand>

					<Navbar.Toggle aria-controls="basic-navbar-nav" className="bg-white">
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
						<Nav className="mx-auto">
							<Search />
						</Nav>
						<Nav className="ms-auto navbar-nav navbar-right-wrap nav-top-wrap">
							<Socials />
						</Nav>
					</Navbar.Collapse>
				</Container>
			</Navbar>
			<div style={{ paddingTop: "100px" }} />
		</Fragment>
	);
};

export default NavbarDefault;
