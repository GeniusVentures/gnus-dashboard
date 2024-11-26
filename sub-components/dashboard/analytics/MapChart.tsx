// import node module libraries
import React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

// Import required data files
import WorldMap from "data/charts/WorldMap";
import { Card } from "react-bootstrap";

const MapChart = ({ setModal }) => {
  const markers = [
    {
      coordinates: [-11.6368, 53.613],
    },
    { coordinates: [73.7276105, 20.7504374] },
    {
      coordinates: [-104.657039, 37.2580397],
    },
    {
      coordinates: [115.2092761, -25.0304388],
    },
  ];

  return (
    <div>
      <Card className="h-100 text-white px-0 pt-5 item-stretch">
        <h5 className="ps-4 ps-sm-5 mb-0">Node Locations</h5>
        <div
          className="mx-auto"
          style={{
            minHeight: "250px",
            maxHeight: "250px",
            width: "95%",
            maxWidth: "350px",
            justifyContent: "center",
            alignContent: "center",
          }}>
          <ComposableMap className="ms-n4">
            <Geographies geography={WorldMap}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#ffffff50"
                  />
                ))
              }
            </Geographies>
            {markers.map(({ coordinates }, index) => (
              <Marker key={index} coordinates={coordinates}>
                <circle
                  r={10}
                  fill="#00000080"
                  stroke="#36edb5"
                  strokeWidth={3}
                />
              </Marker>
            ))}
          </ComposableMap>{" "}
        </div>
        <Card.Footer
          className="p-0 text-center"
          onClick={() => setModal(true)}
          style={{ cursor: "pointer" }}>
          <p className="my-auto py-2 fs-4 text-white">See Chart</p>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default MapChart;
