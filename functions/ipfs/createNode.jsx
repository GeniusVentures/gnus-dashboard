import { createHelia } from "helia";
import { tcp } from "@libp2p/tcp";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { bootstrap } from "@libp2p/bootstrap";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { keychain, KeychainInit } from "@libp2p/keychain";
import { mplex } from "@libp2p/mplex";
import { ping } from "@libp2p/ping";
import { webSockets } from "@libp2p/websockets";
import { ipnsSelector } from "ipns/selector";
import { ipnsValidator } from "ipns/validator";
import { bootstrapConfig } from "data/ipfs/bootstrapConfig";
import { createLibp2p as create } from "libp2p";
import { MemoryBlockstore } from "blockstore-core";
import { MemoryDatastore } from "datastore-core";
import { PeerId } from "@libp2p/interface";
import { DNS } from "@multiformats/dns";

let node = null;

const createNode = async () => {
	try {
		const blockstore = new MemoryBlockstore();
		const datastore = new MemoryDatastore();

		const libp2p = await create({
			peerId: PeerId,
			dns: DNS,
			addresses: {
				listen: ["/ip4/0.0.0.0/tcp/0"],
			},
			transports: [
				tcp(),
				webSockets(),
				circuitRelayTransport({
					discoverRelays: 1,
				}),
			],
			connectionEncryption: [noise()],
			streamMuxers: [mplex()],
			peerDiscovery: [bootstrap(bootstrapConfig)],
			services: {
				pubsub: gossipsub(),
				dht: kadDHT({
					clientMode: true,
					validators: {
						ipns: ipnsValidator,
					},
					selectors: {
						ipns: ipnsSelector,
					},
				}),
				identify: identify(),
				keychain: keychain(KeychainInit),
				// ping: ping(),
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
		node = heliaNode;
		console.log("line74: " + node.libp2p.getMultiaddrs()[0]);
		libp2p.services.pubsub.subscribe(
			"projects/pubsub-public-data/topics/nyc-citibike-trips",
		);

		node.libp2p.addEventListener("connection:open", () => {
			console.log("opened" + node.libp2p.getPeers().length);
		});
		node.libp2p.addEventListener("connection:close", () => {
			console.log("closed" + node.libp2p.getPeers().length);
		});

		node.libp2p.services.pubsub.addEventListener("message", (event) => {
			const topic = event.detail.topic;
			const message = toString(event.detail.data);

			console.log(topic + `\n` + message);
		});
		setInterval(() => {
			const peerList = libp2p.services.pubsub.getSubscribers();
			console.log(peerList);
		}, 3000);
	} catch (err) {
		console.log(err);
	}
};

export default createNode;
