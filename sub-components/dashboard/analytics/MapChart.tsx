// Import node module libraries
import React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

// Import required data files
import WorldMap from "data/map/worldMap";
import { Card } from "react-bootstrap";
import markers from "data/map/markers";
// Define marker type
interface MarkerType {
  coordinates: [number, number]; // Tuple for latitude and longitude
}

// Define component props type
interface MapChartProps {
  setModal: (value: boolean) => void; // Function to toggle modal
}

const MapChart: React.FC<MapChartProps> = ({ setModal }) => {
  return (
    <div>
      <Card className="h-100 text-white px-0 pt-5 item-stretch">
        <span className="fw-semi-bold text-uppercase text-white fs-6 ps-4">
          Node Locations
        </span>
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
            {markers.map(({ coordinates }: MarkerType, index) => (
              <Marker key={index} coordinates={coordinates}>
                <circle
                  r={10}
                  fill="#00000080"
                  stroke="#36edb5"
                  strokeWidth={3}
                />
              </Marker>
            ))}
          </ComposableMap>
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
