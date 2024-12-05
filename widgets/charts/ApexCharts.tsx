import { Fragment, useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ApexChartsProps {
  options?: object;
  series: Array<any>;
  type:
    | "area"
    | "line"
    | "bar"
    | "pie"
    | "donut"
    | "radialBar"
    | "scatter"
    | "bubble"
    | "heatmap"
    | "candlestick"
    | "boxPlot"
    | "radar"
    | "polarArea"
    | "rangeBar"
    | "rangeArea"
    | "treemap";
  width?: number | string;
  height?: number | string;
}

const ApexCharts: React.FC<ApexChartsProps> = ({
  options,
  series,
  width,
  type,
  height,
}) => {
  const [windowDefined, setWindowDefined] = useState(false);
  useEffect(() => {
    console.log(type);

    setWindowDefined(true);
  }, []);

  return (
    <Fragment>
      {windowDefined && (
        <Chart
          options={options}
          series={series}
          type={type}
          width={width}
          height={height}
        />
      )}
    </Fragment>
  );
};

export default ApexCharts;
