import { Fragment, useEffect, useState } from "react";
import { Row } from "react-bootstrap";
import OrderForm from "../../sub-components/job-order/OrderForm";
import { useAutoAnimate } from "@formkit/auto-animate/react";

const JobOrders: React.FC = () => {
  const [parent] = useAutoAnimate();
  const [width, setWidth] = useState<number>(0);
  const [showForm, setShowForm] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);

    setTimeout(() => {
      setShowForm(true);
    }, 500);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <Fragment>
      <div
        style={{ minHeight: "100vh", backgroundColor: "#00000060" }}
        className="py-15">
        <Row className="justify-content-center mx-3 mx-lg-10">
          {width >= 1200 && (
            <div className="text-center mt-5">
              <h1 className="display-3 text-white">
                Job Processing Order Form
              </h1>
            </div>
          )}
          {width >= 900 && width < 1200 && (
            <div className="text-center mt-5">
              <h1 className="display-4 text-white">
                Job Processing Order Form
              </h1>
            </div>
          )}
          {width < 900 && (
            <div className="text-center mt-5">
              <h1 className="display-5 text-white">
                Job Processing Order Form
              </h1>
            </div>
          )}
        </Row>
        <Row ref={parent} className="justify-content-center mx-3 mx-lg-10">
          {showForm && <OrderForm />}
        </Row>
      </div>
    </Fragment>
  );
};

export default JobOrders;
