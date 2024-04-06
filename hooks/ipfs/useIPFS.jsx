import { useEffect, useState } from "react";
import { createHelia } from "helia";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { createDelegatedRoutingV1HttpApiClient } from "@helia/delegated-routing-v1-http-api-client";
import { autoNAT } from "@libp2p/autonat";
import { bootstrap } from "@libp2p/bootstrap";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { dcutr } from "@libp2p/dcutr";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { keychain, KeychainInit } from "@libp2p/keychain";
import { mplex } from "@libp2p/mplex";
import { ping } from "@libp2p/ping";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import { webTransport } from "@libp2p/webtransport";
import { ipnsSelector } from "ipns/selector";
import { ipnsValidator } from "ipns/validator";
import * as libp2pInfo from "libp2p/version";
import { name, version } from "data/ipfs/version";
import { bootstrapConfig } from "data/ipfs/bootstrapConfig";
import { createLibp2p as create } from "libp2p";
import { MemoryBlockstore } from "blockstore-core";
import { MemoryDatastore } from "datastore-core";
import { Libp2p, PeerId } from "@libp2p/interface";
import { DNS } from "@multiformats/dns";

const useIPFS = () => {
  const [node, setNode] = useState(null);
  const [connectedPeersCount, setConnectedPeersCount] = useState(0);
  const [peerId, setPeerId] = useState(null);
  const [connectedPeers, setConnectedPeers] = useState(0);

  // useEffect(() => {
  // 	startNode().then(() => {
  // 		console.log(true);
  // 		beginPubsub();
  // 	});
  // }, []);

  // useEffect(() => {
  // 	if (peerId) {
  // 		console.log(peerId);
  // 	}
  // }, [peerId]);

  // useEffect(() => {
  // 	console.log(node);
  // 	if (node) {
  // 		getPeerId();

  // 		setInterval(() => {
  // 			getConnectedPeersCount();
  // 			getConnectedPeers();
  // 		}, 3000);
  // 	}
  // }, [node]);

  // useEffect(() => {
  // 	console.log("connected peers: " + connectedPeers);
  // }, [connectedPeers]);

  const startNode = async () => {
    const blockstore = new MemoryBlockstore();
    const datastore = new MemoryDatastore();

    const libp2p = await create({
      peerId: PeerId,
      dns: DNS,
      addresses: {
        listen: ["/webrtc"],
      },
      transports: [
        circuitRelayTransport({
          discoverRelays: 1,
        }),
        webRTC(),
        webRTCDirect(),
        webTransport(),
        webSockets(),
      ],
      connectionEncryption: [noise()],
      streamMuxers: [yamux(), mplex()],
      peerDiscovery: [bootstrap(bootstrapConfig)],
      services: {
        pubsub: gossipsub(),
        autoNAT: autoNAT(),
        dcutr: dcutr(),
        delegatedRouting: () =>
          createDelegatedRoutingV1HttpApiClient("https://delegated-ipfs.dev"),
        dht: kadDHT({
          clientMode: true,
          validators: {
            ipns: ipnsValidator,
          },
          selectors: {
            ipns: ipnsSelector,
          },
        }),
        identify: identify({
          agentVersion: `${name}/${version} ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.navigator.userAgent}`,
        }),
        keychain: keychain(KeychainInit),
        ping: ping(),
      },
    });

    // Create Helia node
    const heliaNode = await createHelia({
      datastore,
      blockstore,
      libp2p,
    }).catch((error) => {
      console.error("Error starting Helia node:", error);
    });
    await setNode(heliaNode);
    const addresses = await heliaNode.libp2p.multiaddrs;
    console.log("Multiaddr:", addresses);
  };

  const beginPubsub = async () => {
    console.log(node);
    node.libp2p.services.pubsub.addEventListener("message", (message) => {
      console.log(`${message.from}:`, new TextDecoder().decode(message.data));
    });

    await node.libp2p.services.pubsub.subscribe("ipfs"); // Subscribe to the 'ipfs' topic

    try {
      await node.libp2p.services.pubsub.publish(
        "ipfs", // Publish to the 'ipfs' topic
        new TextEncoder().encode("Hello IPFS")
      );
    } catch (error) {
      console.error("Error publishing message:", error);
    }
  };

  const getConnectedPeersCount = async () => {
    const peers = await node.libp2p.services.pubsub.getSubscribers("ipfs");
    console.log("subscribers: " + peers);
    setConnectedPeersCount(peers.length);
  };

  const getConnectedPeers = async () => {
    console.log(node.libp2p.peerStore.store.datastore.data.size);
    const peers = await node.libp2p.peerStore.datastore.data.size;
    setConnectedPeers(peers);
  };

  const getPeerId = async () => {
    const id = await node.libp2p.peerId;
    setPeerId(id._idB58String);
  };

  return {
    startNode,
    connectedPeersCount,
  };
};

export default useIPFS;
