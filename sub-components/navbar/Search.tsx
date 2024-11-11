import { useState, useEffect } from "react";
import { Form, Col, Image } from "react-bootstrap";
import { useRouter } from "next/router";
import validator from "validator";
import { toast } from "react-toastify";
const SearchBar: React.FC = () => {
  const router = useRouter();
  const [formSearch, setFormSearch] = useState<string>("");

  const search = (event: any) => {
    event.preventDefault();
    if (validator.isHexadecimal(formSearch) && formSearch.length === 66) {
      router.push(`/transaction/${formSearch}`);
    } else if (validator.isEthereumAddress(formSearch)) {
      router.push(`/address/${formSearch}`);
    } else if (validator.isInt(formSearch)) {
      router.push(`/block/${formSearch}`);
    } else {
      toast.error(`The data entered was invalid, please try again.`, {
        className: "gnus-toast",
        icon: <Image height={30} src="images/logo/gnus-icon-red.png" />,
      });
    }
  };

  return (
    <Col
      style={{ maxWidth: "400px", width: "85vw" }}
      className="mx-auto mb-2 mb-lg-0">
      <Form
        onSubmit={search}
        className="mt-3 mt-lg-0 d-flex align-items-center text-white">
        <span
          className="position-absolute ps-3 search-icon pointer"
          style={{ zIndex: 10 }}>
          <i className="fe fe-search text-white"></i>
        </span>
        <Form.Control
          onChange={(e) => {
            setFormSearch(e.target.value);
          }}
          type="search"
          id="formSearch"
          className="ps-6 pe-0 fs-5 my-1 pe-2 text-white bg-trans blur border-primary"
          placeholder="Block Number, TX Hash, Wallet Address..."
        />
      </Form>
    </Col>
  );
};

export default SearchBar;
