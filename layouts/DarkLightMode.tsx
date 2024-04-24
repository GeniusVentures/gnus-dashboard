// import node module libraries
import Link from "next/link";
import { Fragment, useEffect } from "react";
import { Form, Image } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";

// import chat actions from Redux chatSlice
import { changeSkin } from "../store/appSlice";

// import required hook
import useLocalStorage from "../hooks/useLocalStorage";

const DarkLightMode = ({ className }) => {
  // Redux state and dispatch
  const defaultSkin = useSelector((state) => state.app.skin);
  const dispatch = useDispatch();

  const { storageValue, setStorageValue, getStorageValue } = useLocalStorage(
    "skin",
    defaultSkin
  );
  useEffect(() => {
    document
      .querySelector("html")
      .setAttribute("data-theme", getStorageValue("skin", "light"));
    dispatch(changeSkin(storageValue));
  }, [storageValue]);

  const changeColorMode = () => {
    setStorageValue(storageValue === "light" ? "dark" : "light");
    dispatch(changeSkin(storageValue));
  };
  return (
    <Fragment>
      <Link
        href="#"
        type="checkbox"
        id="flexSwitchCheckDefault"
        onClick={changeColorMode}
        className={`form-check form-switch theme-switch btn btn-light btn-icon rounded-circle ${className}`}
      >
        <Form.Check.Input
          type="checkbox"
          isValid
          value={storageValue}
          onClick={changeColorMode}
          style={{ display: "none" }}
        />
        <Form.Check.Label style={{ cursor: "pointer" }}>
          <Image
            src={
              storageValue == "dark"
                ? "/images/svg/moon.svg"
                : "/images/svg/sun.svg"
            }
            alt=""
          />
        </Form.Check.Label>
      </Link>
    </Fragment>
  );
};

export default DarkLightMode;
