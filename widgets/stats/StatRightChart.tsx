// import node module libraries
import { Card, Row, Col } from "react-bootstrap";

// import custom components
import ApexCharts from "widgets/charts/ApexCharts";
import activeNodesOptions from "data/charts/activeNodes";

interface StatRightChartProps {
  title: string;
  value: string | number;
  summaryValue?: string | number;
  summaryIcon?: "up" | "down";
  showSummaryIcon?: boolean;
  series: Array<any>;
  classValue?: string;
  chartName: "ActiveNodes";
}

// Function to dynamically render charts
function ShowChart(chartName: string, series: Array<any>): JSX.Element {
  switch (chartName) {
    case "ActiveNodes":
      return (
        <ApexCharts
          options={activeNodesOptions}
          series={series}
          height={85}
          width={125}
          type="area"
        />
      );
    default:
      return <span>{chartName} chart is undefined</span>;
  }
}

// Functional component with TypeScript
const StatRightChart: React.FC<StatRightChartProps> = ({
  title,
  value,
  summaryValue,
  summaryIcon,
  showSummaryIcon,
  chartName,
  series,
}) => {
  return (
    <Card.Body>
      <Row>
        <Col md={12} lg={12} xl={12} sm={12}>
          <span className="fw-semi-bold text-uppercase text-white fs-6">
            {title}
          </span>
        </Col>
        <Col md={6} lg={6} xl={6} sm={6}>
          <h1 className="fw-bold mt-2 mb-0 display-4 text-white">{value}</h1>
          <p
            className={`text-${
              summaryIcon === "up" ? "success" : "danger"
            } fw-semi-bold mb-0`}>
            {showSummaryIcon && (
              <i className={`fe fe-trending-${summaryIcon} me-1`}></i>
            )}{" "}
            {summaryValue}
          </p>
        </Col>
        <Col
          md={6}
          lg={6}
          xl={6}
          sm={6}
          className="d-flex align-items-center mt-n5"
          style={{ overflow: "visible" }}>
          {ShowChart(chartName, series)}
        </Col>
      </Row>
    </Card.Body>
  );
};

export default StatRightChart;
