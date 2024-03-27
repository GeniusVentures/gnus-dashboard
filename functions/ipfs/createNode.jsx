import Libp2p from "libp2p";
import WebRTCStar from "libp2p-webrtc-star";
import KadDHT from "libp2p-kad-dht";
import Gossipsub from "@chainsafe/libp2p-gossipsub";
import SECIO from "libp2p-secio";
import PeerId from "peer-id";
import PeerInfo from "peer-info";

const ipfsBootstrapList = [
  "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUoL2LkKbZqbXXDX8abRwoTB",
  "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM",
  "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu",
];

const createNode = async () => {
  try {
    // Create a new PeerId
    const peerId = await PeerId.create({ bits: 2048 });

    // Create a new PeerInfo object with the created PeerId
    const peerInfo = new PeerInfo(peerId);

    const libp2p = await Libp2p.create({
      addresses: {
        listen: [],
      },
      modules: {
        transport: [WebRTCStar],
        streamMuxer: [],
        connEncryption: [SECIO],
        peerDiscovery: [KadDHT],
        pubsub: Gossipsub,
      },
      config: {
        peerDiscovery: {
          autoDial: true,
          [KadDHT.tag]: {
            enabled: true,
            kBucketSize: 20,
          },
          bootstrap: {
            list: ipfsBootstrapList,
          },
        },
        pubsub: {
          enabled: true,
          emitSelf: true,
          signMessages: true,
          strictSigning: true,
        },
      },
      peerInfo,
    });

    // Start the libp2p node
    await libp2p.start();

    // Add multiaddr to peerInfo
    peerInfo.multiaddrs.add(
      "/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star"
    );

    libp2p.on("peer:discovery", (peerId) => {
      console.log(`Discovered peer ${peerId.toB58String()}`);
    });

    const topic = "/general";
    libp2p.pubsub.subscribe(topic, (msg) => {
      console.log(
        `Received message: ${msg.data.toString()} from topic: ${topic}`
      );
    });

    console.log(`Subscribed to topic: ${topic}`);

    return libp2p;
  } catch (error) {
    console.error("Error starting libp2p node:", error);
  }
};

export default createNode;
