import { createLibp2p } from "libp2p";
import { tcp } from "@libp2p/tcp";
import { mplex } from "@libp2p/mplex";
import { yamux } from "@chainsafe/libp2p-yamux";
import { noise } from "@chainsafe/libp2p-noise";
import { mdns } from "@libp2p/mdns";
import { bootstrap } from "@libp2p/bootstrap";

const startLibp2p = async (req, res) => {
  try {
    const node = await createLibp2p({
      transports: [tcp()],
      streamMuxers: [yamux(), mplex()],
      connectionEncryption: [noise()],
      peerDiscovery: [
        mdns({
          interval: 1000,
        }),
        bootstrap({
          list: [
            // A list of bootstrap peers to connect to starting up the node
            "/ip4/174.105.212.181/tcp/40002/p2p/12D3KooWRm16iwAdRsAYzGGXU9rq9ZqGbJqaP2kYxe4mCdhEQz67",
          ],
        }),
      ],
    });

    await node.start();
    console.log("libp2p has started");

    // print out listening addresses
    console.log(node.peerId);
    console.log(node.getConnections());
    // stop libp2p
    await node.stop();
    console.log("libp2p has stopped");
  } catch (error) {
    console.error("Error starting Libp2p:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default startLibp2p;
