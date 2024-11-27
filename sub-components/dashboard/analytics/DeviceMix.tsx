import React from "react";
import { Card, Image } from "react-bootstrap";
import ApexCharts from "widgets/charts/ApexCharts";

interface DeviceMixProps {
  setModal: (value: boolean) => void; // Function to toggle modal visibility
}

const DeviceMix: React.FC<DeviceMixProps> = ({ setModal }) => {
  return (
    <Card className="h-100 text-white px-0 pt-5 item-stretch">
      <h5 className="ps-4 ps-sm-5 mb-0">Device Mix</h5>
      <div
        className="mx-auto"
        style={{
          minHeight: "250px",
          maxHeight: "250px",
          width: "100%",
          maxWidth: "360px",
          justifyContent: "center",
          alignContent: "center",
        }}>
        <ApexCharts
          series={[30, 15, 10, 15, 20]} // Data for the chart
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
                useSeriesColors: false,
              },
              formatter: function (seriesName, opts) {
                const images = [
                  "/images/icons/android.png",
                  "/images/icons/apple.png",
                  "/images/icons/windows.png",
                  "/images/icons/mac.png",
                  "/images/icons/linux.png",
                ];
                return `<div style="display: flex; align-items: center; margin-left: 5px;">
                        <img src="${images[opts.seriesIndex]}" alt="${seriesName}" style="height: 30px; width: 30px; margin-right: 5px;" />
                        </div>`;
              },
            },
            colors: [
              "#3ddc84", // Android Green
              "#ffffff", // iOS Gray
              "#00A4EF", // Windows Blue
              "#7D7D7D", // Mac White
              "#f4b71a", // Linux Orange
            ],
            labels: ["Android", "iOS", "Windows", "Mac", "Linux"], // Chart labels
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
              custom: function ({ series, seriesIndex }) {
                const labels = ["Android", "iOS", "Windows", "Mac", "Linux"];
                const images = [
                  "/images/icons/android.png",
                  "/images/icons/apple.png",
                  "/images/icons/windows.png",
                  "/images/icons/mac.png",
                  "/images/icons/linux.png",
                ];
                return `<div style="display: flex; align-items: center; gap: 10px;">
                  <img src="${images[seriesIndex]}" alt="Device" style="width: 20px; height: 20px;" />
                  <span><strong>${labels[seriesIndex]} ${series[seriesIndex]}%</strong></span>
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

export default DeviceMix;
