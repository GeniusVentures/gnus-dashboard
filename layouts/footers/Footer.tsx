// Footer.js

import { Fragment, useState, useEffect } from "react";

const Footer = () => {
	const [year] = useState(new Date().getFullYear());

	return (
		<Fragment>
			<div
				id="footer"
				style={{
					backgroundColor: "white",
					height: "100px",
					alignItems: "flex-end",
					width: "100%",
					zIndex: "999",
					color: "2a2b31",
				}}
				className="d-flex justify-content-between blur mt-10 px-16">
				<p>© GNUS.AI {year}</p>
				<p>v0.0.1</p>
			</div>
		</Fragment>
	);
};

export default Footer;
