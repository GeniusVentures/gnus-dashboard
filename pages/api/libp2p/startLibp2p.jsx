import { createHelia } from "helia";
import { tcp } from "@libp2p/tcp";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";

const startLibp2p = async (req, res) => {
  console.log(createHelia);
  // Helia node configuration
  const libp2pOptions = {
    modules: {
      transport: [tcp()],
      streamMuxer: [mplex()],
      connEncryption: [noise()],
    },
    config: {
      peerDiscovery: {
        autoDial: true,
      },
    },
  };

  // Create Helia node
  const node = await createHelia(libp2pOptions).catch((error) => {
    console.error("Error starting Helia node:", error);
  });
  console.log(node.libp2p.status);

  // // Start Helia node
  // node.start()
  //   .then(() => {
  //     console.log("Helia node started successfully");
  //   })
};

export default startLibp2p;
