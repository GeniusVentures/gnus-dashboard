import { Card } from "react-bootstrap";
import ApexCharts from "widgets/charts/ApexCharts";

const AggregateSpeed = ({ setModal }) => {
  return (
    <Card className="h-100 text-white px-0 pt-5 item-stretch">
      <h5 className="ps-4 ps-sm-5 mb-0">Device Mix</h5>
      <div
        className="mx-auto"
        style={{
          minHeight: "250px",
          maxHeight: "250px",
          width: "100%",
          maxWidth: "350px",
          justifyContent: "center",
          alignContent: "center",
        }}>
        <ApexCharts
          series={[30, 15, 10, 15, 20]}
          type="polarArea"
          options={{
            fill: { opacity: 0.95 },
            chart: {
              foreColor: "#FFFFFF", // Adjust text color
              toolbar: {
                show: false, // Disable toolbar interactions
              },
            },
            legend: {
              position: "bottom",
              labels: {
                colors: "#FFFFFF", // Adjust legend text color
              },
            },
            opacity: 1,
            colors: [
              "#3ddc84", // Android Green
              "#7D7D7D", // iOS Gray
              "#00A4EF", // Windows Blue
              "#ffffff", // Mac White
              "#ff6c0e", // Linux Orange
            ],
            labels: ["Android", "iOS", "Windows", "Mac", "Linux"],
            plotOptions: {
              polarArea: {
                rings: {
                  strokeColor: "#FFFFFF50",
                },
                spokes: {
                  strokeWidth: 0.1,
                  connectorColors: "#FFFFFF50",
                },
              },
            },
            tooltip: {
              enabled: true, // Enable tooltips
              theme: "custom", // Custom theme
              custom: function ({ series, seriesIndex, w }) {
                return `<div className="apexcharts-tooltip apexcharts-tooltip-series-group">
                        <strong>${w.globals.labels[seriesIndex]}</strong>: ${series[seriesIndex]}%
                      </div>`;
              },
            },
          }}
          height="240px"
        />
      </div>
      <Card.Footer
        className="p-0 text-center"
        onClick={() => setModal(true)}
        style={{ cursor: "pointer" }}>
        <p className="my-auto py-2 fs-4 text-white">See Chart</p>
      </Card.Footer>
    </Card>
  );
};

export default AggregateSpeed;
