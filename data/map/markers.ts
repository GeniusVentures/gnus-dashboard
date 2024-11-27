interface MarkerType {
  coordinates: [number, number]; // Tuple for latitude and longitude
}

// Define the markers array with type
const markers: MarkerType[] = [
  {
    coordinates: [-118.2437, 34.0522], // Los Angeles, USA
  },
  {
    coordinates: [-74.006, 40.7128], // New York, USA
  },
  {
    coordinates: [-95.3698, 29.7604], // Houston, USA
  },
  {
    coordinates: [-0.1278, 51.5074], // London, UK
  },
  {
    coordinates: [103.8198, 1.3521], // Singapore
  },
  {
    coordinates: [121.5654, 25.033], // Taiwan (Taipei)
  },
  {
    coordinates: [115.8605, -31.9505], // Perth, Australia
  },
  {
    coordinates: [151.2093, -33.8688], // Sydney, Australia
  },
  {
    coordinates: [-89.2182, 13.6929], // El Salvador (San Salvador)
  },
  {
    coordinates: [13.405, 52.52], // Berlin, Germany
  },
  {
    coordinates: [-43.1729, -22.9068], // Rio de Janeiro, Brazil
  },
  {
    coordinates: [18.4241, -33.9249], // Cape Town, South Africa
  },
  {
    coordinates: [-70.6483, -33.4489], // Santiago, Chile
  },
  {
    coordinates: [55.2708, 25.2048], // Dubai, UAE
  },
  {
    coordinates: [106.8456, -6.2088], // Jakarta, Indonesia
  },
  {
    coordinates: [-79.3832, 43.6532], // Toronto, Canada
  },
];

export default markers;
