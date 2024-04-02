import { useEffect, useState } from "react";
import { createHelia } from "helia";
// import { noise } from "@chainsafe/libp2p-noise";
// import { mplex } from "@libp2p/mplex";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";

const useIPFS = () => {
  const [node, setNode] = useState(null);
  const [gnusData, setGnusData] = useState(null);

  useEffect(() => {
    startNode().then(() => {
      beginPubsub();
    });
  }, []);

  useEffect(() => {
    console.log(node);
  }, [node]);

  const startNode = async () => {
    const libp2pOptions = {
      modules: {
        // streamMuxer: [mplex()],
        // connEncryption: [noise()],
      },
      services: {
        pubsub: gossipsub(),
      },

      config: {
        peerDiscovery: {
          autoDial: true,
        },
      },
    };

    // Create Helia node
    const libp2p = await createHelia({ libp2p: libp2pOptions }).catch(
      (error) => {
        console.error("Error starting Helia node:", error);
      }
    );
    await setNode(libp2p);
    return;
  };

  const beginPubsub = () => {
    console.log(node);
    node.libp2p.services.pubsub.addEventListener("message", (message) => {
      console.log(
        `${message.detail.topic}:`,
        new TextDecoder().decode(message.detail.data)
      );
    });
    node.libp2p.services.pubsub.subscribe("fruit");

    node.libp2p.services.pubsub.publish(
      "fruit",
      new TextEncoder().encode("banana")
    );
  };

  return {
    startNode,
    gnusData,
  };
};

export default useIPFS;
