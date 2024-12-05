const activeNodesOptions = {
  chart: {
    toolbar: { show: false },
    sparkline: { enabled: !0 },
  },
  dataLabels: { enabled: !1 },
  stroke: { curve: "smooth", width: 2 },
  colors: ["#29baf9"],
  fill: {
    type: "gradient",
    gradient: {
      gradientToColors: ["#36edb5"],
      opacityFrom: 0.85,
      opacityTo: 0,
      stops: [0, 100],
    },
  },
  xaxis: { labels: { show: !1 }, axisBorder: { show: !1 } },
  yaxis: [
    {
      y: 0,
      offsetX: 0,
      offsetY: 0,
      padding: { left: 0, right: 0 },
    },
  ],
  tooltip: {
    theme: "dark",
    enabled: true, // Enable tooltips
    custom: function ({ series, dataPointIndex }) {
      console.log(dataPointIndex);
      return `<div style="display: flex; align-items: center; gap: 10px;">
                  <span><strong>${series[0][dataPointIndex]} Nodes</strong></span>
                </div>`;
    },
  },
};

export default activeNodesOptions;
