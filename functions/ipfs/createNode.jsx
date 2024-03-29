// import Helia from "helia";
// import TCP from "@libp2p/tcp";
// import { noise } from "@chainsafe/libp2p-noise";
// import { mplex } from "@libp2p/mplex";

const createNode = async () => {
  // Initialize TCP transport
  //   const transport = new TCP();
  //   // Initialize Noise encryption
  //   const noiseConfig = {
  //     // Your Noise configuration here
  //   };
  //   const noiseSecure = new noise.Noise(noiseConfig);
  //   // Initialize Mplex multiplexing
  //   const multiplex = new mplex.Multiplex();
  //   // Helia node configuration
  //   const libp2pOptions = {
  //     modules: {
  //       transport: [transport],
  //       streamMuxer: [multiplex],
  //       connEncryption: [noiseSecure],
  //     },
  //     config: {
  //       peerDiscovery: {
  //         autoDial: true,
  //       },
  //     },
  //   };
  //   // Create Helia node
  //   const node = new Helia(libp2pOptions);
  //   // Start Helia node
  //   node
  //     .start()
  //     .then(() => {
  //       console.log("Helia node started successfully");
  //     })
  //     .catch((error) => {
  //       console.error("Error starting Helia node:", error);
  //     });
};

export default createNode;
