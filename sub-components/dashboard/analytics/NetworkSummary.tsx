"use client";

import { Row, Card, Modal, Col } from "react-bootstrap";
import { Fragment, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
const GaugeComponent = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

const NetworkInfo: React.FC = () => {
  const [modal, setModal] = useState<boolean>(false);
  const [displayer, setDisplayer] = useState<string | null>(null);
  const [aggSpeed, setAggSpeed] = useState<number>(0);
  const speedIntRef = useRef<NodeJS.Timeout | null>(null);
  const prevSpeedRef = useRef<number>(169.7);

  const speedInt = () => {
    const minSpeedPer = 150.2;
    const maxSpeedPer = 183.5;

    speedIntRef.current = setInterval(() => {
      const change = Math.random() * 0.5 - 0.3;
      let newSpeed = prevSpeedRef.current + change;
      newSpeed = Math.max(minSpeedPer, Math.min(maxSpeedPer, newSpeed));
      setAggSpeed(newSpeed);
      prevSpeedRef.current = newSpeed;
    }, 4000);
  };

  useEffect(() => {
    speedInt();
    return () => clearInterval(speedIntRef.current);
  }, []);

  return (
    <Fragment>
      <Row className="justify-content-center gap-5 d-flex align-items-stretch px-0">
        <h2 className="display-7 text-white mb-0">Network Summary</h2>
        {/* First Card */}
        <Col style={{ maxWidth: "600px", minWidth: "300px" }} className="mb-4">
          <Card className="h-100 text-white px-0 pt-5 text-white item-stretch">
            <h5 className="ps-4 ps-sm-5 mb-0 mb-0">Aggregate Speed</h5>
            <div
              className="mx-auto"
              style={{
                minHeight: "250px",
                maxHeight: "250px",
                alignContent: "center",
                height: "100%",
                width: "95%",
                maxWidth: "350px",
                justifyContent: "center",
              }}>
              <GaugeComponent
                marginInPercent={0.067}
                type="semicircle"
                arc={{
                  subArcs: [{ limit: 1, color: "#5c5c5c", showTick: true }],
                  nbSubArcs: 25,
                  colorArray: ["#36edb5", "#34A5C7"],
                  width: 0.2,
                  padding: 0.05,
                }}
                minValue={0}
                maxValue={1800}
                value={aggSpeed}
                labels={{
                  valueLabel: {
                    style: { fontSize: 35 },
                    formatTextValue: () => aggSpeed.toFixed(2) + " TF/s",
                  },
                  tickLabels: {
                    type: "outer",
                    defaultTickValueConfig: {
                      formatTextValue: (value) => value + " TF/s",
                      style: { fontSize: 10 },
                    },
                    ticks: [
                      { value: 300 },
                      { value: 600 },
                      { value: 900 },
                      { value: 1200 },
                      { value: 1500 },
                    ],
                  },
                }}
              />
            </div>
            <Card.Footer
              className="p-0 text-center"
              onClick={() => setModal(true)}
              style={{ cursor: "pointer" }}>
              <p className="my-auto py-2 fs-4 text-white">See Chart</p>
            </Card.Footer>
          </Card>
        </Col>
        <Col style={{ maxWidth: "600px", minWidth: "300px" }} className="mb-4">
          <Card className="h-100 text-white px-0 pt-5 text-white">
            <h5 className="ps-4 ps-sm-5 mb-0">Aggregate Speed</h5>
            <div
              className="mx-auto"
              style={{
                minHeight: "250px",
                maxHeight: "250px",
                width: "95%",
                maxWidth: "350px",
                alignContent: "center",
              }}>
              <GaugeComponent
                marginInPercent={0.07}
                type="grafana"
                arc={{
                  subArcs: [{ limit: 1, showTick: true }],
                  nbSubArcs: 100,
                  colorArray: ["#36edb5", "#34A5C7"],
                  width: 0.3,
                }}
                minValue={0}
                maxValue={1800}
                value={aggSpeed}
                labels={{
                  valueLabel: {
                    style: { fontSize: 35 },
                    formatTextValue: () => aggSpeed.toFixed(2) + " TF/s",
                  },
                  tickLabels: {
                    type: "outer",
                    defaultTickValueConfig: {
                      formatTextValue: (value) => value + " TF/s",
                      style: { fontSize: 10 },
                    },
                    ticks: [
                      { value: 300 },
                      { value: 600 },
                      { value: 900 },
                      { value: 1200 },
                      { value: 1500 },
                    ],
                  },
                }}
              />
            </div>
            <Card.Footer
              className="p-0 text-center"
              onClick={() => setModal(true)}
              style={{ cursor: "pointer" }}>
              <p className="my-auto py-2 fs-4 text-white">See Chart</p>
            </Card.Footer>
          </Card>
        </Col>
        <Col style={{ maxWidth: "600px", minWidth: "300px" }} className="mb-4">
          <Card className="h-100 text-white px-0 pt-5 text-white">
            <h5 className="ps-4 ps-sm-5 mb-0">Aggregate Speed</h5>
            <div
              className="mx-auto my-auto"
              style={{
                minHeight: "250px",
                maxHeight: "250px",
                width: "95%",
                maxWidth: "350px",
                alignContent: "center",
                justifyContent: "center",
              }}>
              <GaugeComponent
                marginInPercent={0.063}
                type="radial"
                arc={{
                  subArcs: [{ limit: 1, color: "#5c5c5c", showTick: true }],
                  nbSubArcs: 25,
                  colorArray: ["#36edb5", "#34A5C7"],
                  width: 0.2,
                  padding: 0.05,
                }}
                minValue={0}
                maxValue={1800}
                value={aggSpeed}
                labels={{
                  valueLabel: {
                    style: { fontSize: 35 },
                    formatTextValue: () => aggSpeed.toFixed(2) + " TF/s",
                  },
                  tickLabels: {
                    type: "outer",
                    defaultTickValueConfig: {
                      formatTextValue: (value) => value + " TF/s",
                      style: { fontSize: 10 },
                    },
                    ticks: [
                      { value: 300 },
                      { value: 600 },
                      { value: 900 },
                      { value: 1200 },
                      { value: 1500 },
                    ],
                  },
                }}
              />
            </div>
            <Card.Footer
              className="p-0 text-center"
              onClick={() => setModal(true)}
              style={{ cursor: "pointer" }}>
              <p className="my-auto py-2 fs-4 text-white">See Chart</p>
            </Card.Footer>
          </Card>
        </Col>
        <Col style={{ maxWidth: "600px", minWidth: "300px" }} className="mb-4">
          <Card className="h-100 text-white px-0 pt-5 text-white">
            <h5 className="ps-4 ps-sm-5 mb-0">Aggregate Speed</h5>
            <div
              className="mx-auto my-auto"
              style={{
                minHeight: "250px",
                maxHeight: "250px",
                width: "95%",
                maxWidth: "350px",
                alignContent: "center",
                justifyContent: "center",
                height: "100%",
              }}>
              <GaugeComponent
                marginInPercent={0.067}
                type="semicircle"
                arc={{
                  subArcs: [
                    { limit: 2, color: "#36edb5", showTick: true },
                    { limit: 4, color: "#34A5C7", showTick: true },
                  ],

                  gradient: true,
                }}
                minValue={0}
                maxValue={1800}
                value={aggSpeed}
                labels={{
                  valueLabel: {
                    style: { fontSize: 35 },
                    formatTextValue: () => aggSpeed.toFixed(2) + " TF/s",
                  },
                  tickLabels: {
                    type: "outer",
                    defaultTickValueConfig: {
                      formatTextValue: (value) => value + " TF/s",
                      style: { fontSize: 10 },
                    },
                    ticks: [
                      { value: 300 },
                      { value: 600 },
                      { value: 900 },
                      { value: 1200 },
                      { value: 1500 },
                    ],
                  },
                }}
              />
            </div>
            <Card.Footer
              className="p-0 text-center"
              onClick={() => setModal(true)}
              style={{ cursor: "pointer" }}>
              <p className="my-auto py-2 fs-4 text-white">See Chart</p>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      <Modal onHide={() => setModal(false)} show={modal}>
        <Modal.Header closeButton />
        <Modal.Body>{displayer || "No data available"}</Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default NetworkInfo;
