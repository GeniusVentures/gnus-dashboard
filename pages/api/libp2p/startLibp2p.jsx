import { createLibp2p } from "libp2p";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import TCP from "libp2p-tcp";
import MPLEX from "libp2p-mplex";
import { NOISE } from "libp2p-noise";
import crypto from "libp2p-crypto";

const startLibp2p = async (req, res) => {
  try {
    // Generate a key pair for your node
    // const { privateKey, publicKey } = await crypto.keys.generateKeyPair("rsa", {
    //   bits: 2048,
    // });

    // Create a Libp2p node
    const libp2p = await createLibp2p({
      //   addresses: {
      //     listen: [
      //       "/ip4/174.105.212.181/tcp/40002/p2p/12D3KooWRm16iwAdRsAYzGGXU9rq9ZqGbJqaP2kYxe4mCdhEQz67",
      //     ], // Listen on all interfaces, replace with your desired listen address
      //   },
      modules: [
        {
          transport: [TCP], // Use TCP transport module
          streamMuxer: [MPLEX], // Use MPLEX stream muxer
          connEncryption: [NOISE], // Use NOISE connection encryption
          pubsub: gossipsub, // Enable Gossipsub for pubsub functionality
        },
      ],
      //   peerId: {
      //     publicKey,
      //     privateKey,
      //   },
    });

    console.log(libp2p.peerId, libp2p);
  } catch (error) {
    console.error("Error starting Libp2p:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default startLibp2p;
