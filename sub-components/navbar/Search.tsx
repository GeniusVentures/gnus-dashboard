import { useState, useEffect } from "react";
import { Form, Col } from "react-bootstrap";
import { useRouter } from "next/router";
import validator from "validator";
const SearchBar = () => {
	const router = useRouter();
	const [formSearch, setFormSearch] = useState("");
	const [searchError, setSearchError] = useState("");
	const [width, setWidth] = useState("550px");

	const handleResize = () => {
		if (window.innerWidth >= 1450) {
			setWidth("550px");
		} else if (window.innerWidth < 1450 && window.innerWidth >= 1335) {
			setWidth("450px");
		} else if (window.innerWidth < 1335 && window.innerWidth >= 1250) {
			setWidth("350px");
		} else if (window.innerWidth < 1250 && window.innerWidth >= 1220) {
			setWidth("325px");
		} else if (window.innerWidth < 1220 && window.innerWidth >= 1150) {
			setWidth("300px");
		} else {
			setWidth("360px");
		}
	};

	useEffect(() => {
		window.addEventListener("resize", handleResize);
		handleResize();

		// Cleanup function to remove event listener
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []); // Empty dependency array to run this effect only once on component mount

	const search = (event: any) => {
		event.preventDefault();
		if (validator.isHexadecimal(formSearch) && formSearch.length === 66) {
			router.push(`/transaction/${formSearch}`);
		} else if (validator.isEthereumAddress(formSearch)) {
			router.push(`/address/${formSearch}`);
		} else if (validator.isInt(formSearch)) {
			router.push(`/block/${formSearch}`);
		} else {
			setSearchError("The data entered was invalid, please try again.");
		}
	};

	return (
		<Col style={{ width: width }} className="mx-auto mb-2 mb-lg-0">
			<Form
				onSubmit={search}
				className="mt-3 mt-lg-0 d-flex align-items-center text-white">
				<span
					typeof="button"
					onClick={search}
					className="position-absolute ps-3 search-icon">
					<i className="fe fe-search"></i>
				</span>
				<Form.Control
					onChange={(e) => {
						setSearchError("");
						setFormSearch(e.target.value);
					}}
					type="Search"
					id="formSearch"
					style={{ background: "#2A2B31", color: "white" }}
					className="ps-6 pe-0 fs-5 my-1 pe-2 text-white"
					placeholder="Block Number, TX Hash, Wallet Address..."
				/>
			</Form>
			<p className="validationError mb-0 text-center">{searchError}</p>
		</Col>
	);
};

export default SearchBar;
