// import Libp2p from "libp2p";
// import { webSockets } from "@libp2p/websockets";
// import { multiaddr } from "@multiformats/multiaddr";
// import { noise } from "@chainsafe/libp2p-noise";
// import { yamux } from "@chainsafe/libp2p-yamux";
// import { echo } from "@libp2p/echo";
// import {
//   circuitRelayTransport,
//   circuitRelayServer,
// } from "@libp2p/circuit-relay-v2";
// import { identify } from "@libp2p/identify";
// import { webRTC } from "@libp2p/webrtc";
// import * as filters from "@libp2p/websockets/filters";
// import { WebRTC } from "@multiformats/multiaddr-matcher";
// import delay from "delay";
// import { pipe } from "it-pipe";
// import { createLibp2p } from "libp2p";

// import { kadDHT } from "@libp2p/kad-dht";
// import { gossipsub } from "@chainsafe/libp2p-gossipsub";
// import PeerId from "peer-id";
// import PeerInfo from "peer-info";

// const ipfsBootstrapList = [
//   "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUoL2LkKbZqbXXDX8abRwoTB",
//   "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM",
//   "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu",
// ];

const createNode = async () => {
  // const node = await createLibp2p({
  //   transports: [webRTCDirect()],
  //   connectionEncryption: [noise()],
  // });
  // await node.start();
  // // this multiaddr corresponds to a remote node running a WebRTC Direct listener
  // const ma = multiaddr(
  //   "/ip4/0.0.0.0/udp/56093/webrtc-direct/certhash/uEiByaEfNSLBexWBNFZy_QB1vAKEj7JAXDizRs4_SnTflsQ"
  // );
  // const stream = await node.dialProtocol(ma, "/my-protocol/1.0.0", {
  //   signal: AbortSignal.timeout(10_000),
  // });
  // await pipe(
  //   [fromString(`Hello js-libp2p-webrtc\n`)],
  //   stream,
  //   async function (source) {
  //     for await (const buf of source) {
  //       console.info(toString(buf.subarray()));
  //     }
  //   }
  // );
  // try {
  // Create a new PeerId
  // const peerId = await PeerId.create({ bits: 2048 });
  // Create a new PeerInfo object with the created PeerId
  // const peerInfo = new PeerInfo(peerId);
  //   const libp2p = await Libp2p.create({
  //     addresses: {
  //       listen: [],
  //     },
  //     modules: {
  //       transport: [webSockets],
  //       // streamMuxer: [webSockets],
  //       connEncryption: [noise],
  //       peerDiscovery: [kadDHT],
  //       pubsub: gossipsub,
  //     },
  //     config: {
  //       peerDiscovery: {
  //         autoDial: true,
  //         bootstrap: {
  //           list: ipfsBootstrapList,
  //         },
  //       },
  //       pubsub: {
  //         enabled: true,
  //         emitSelf: true,
  //         signMessages: true,
  //         strictSigning: true,
  //       },
  //       transport: {
  //         WebSockets: {
  //           module: webSockets,
  //           transport: webSockets,
  //           listen: ["/dns4/0.0.0.0/tcp/0/wss"],
  //         },
  //       },
  //     },
  //     peerInfo,
  //   });
  //   console.log(libp2p);
  //   // Start the libp2p node
  //   await libp2p.start();
  //   // Add multiaddr to peerInfo
  //   peerInfo.multiaddrs.add(
  //     "/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star"
  //   );
  //   libp2p.on("peer:discovery", (peerId) => {
  //     console.log(`Discovered peer ${peerId.toB58String()}`);
  //   });
  //   const topic = "/general";
  //   libp2p.pubsub.subscribe(topic, (msg) => {
  //     console.log(
  //       `Received message: ${msg.data.toString()} from topic: ${topic}`
  //     );
  //   });
  //   console.log(`Subscribed to topic: ${topic}`);
  //   return libp2p;
  // } catch (error) {
  //   console.error("Error starting libp2p node:", error);
  // }
};

export default createNode;
