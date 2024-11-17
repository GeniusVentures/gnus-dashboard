import { Fragment } from "react";
import { usePricesContext } from "context/prices/PricesContext";
import { Image } from "react-bootstrap";
const Price: React.FC = () => {
  const { price, percentChange24h, gasPrice } = usePricesContext();
  return (
    <Fragment>
      <div className="mx-auto d-inline-block">
        {price && (
          <span className="text-white fw-bold">
            GNUS Price: ${price.toFixed(2)}{" "}
            {percentChange24h && (
              <>
                (
                <span
                  className={`text-${percentChange24h >= 0 ? "primary" : "danger"}`}>
                  {percentChange24h >= 0 ? "+" : ""}
                  {percentChange24h}%
                </span>
                )
              </>
            )}
          </span>
        )}
        {gasPrice && (
          <span className="ms-5 text-white fw-bold">
            <Image height={25} src="images/icons/gas.png" className="me-1" />
            {gasPrice.toFixed(2)} GWEI
          </span>
        )}
      </div>
    </Fragment>
  );
};

export default Price;
