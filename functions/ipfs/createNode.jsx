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
// import { PeerId } from "@libp2p/interface";
import { DNS } from "@multiformats/dns";
import { plaintext } from "@libp2p/plaintext";
import {
	createEd25519PeerId,
	createFromPrivKey,
	createFromPubKey,
} from "@libp2p/peer-id-factory";
import { peerIdFromKeys } from "@libp2p/peer-id";
import { generateKeyPair } from "@libp2p/crypto/keys";

let node = null;

const createNode = async () => {
	// let id = null;
	// id = await generateKeyPair("Ed25519");
	// console.log(id);
	try {
		const blockstore = new MemoryBlockstore();
		const datastore = new MemoryDatastore();

		const libp2p = await create({
			// peerId: await peerIdFromKeys(
			// 	new Uint8Array([
			// 		53, 91, 255, 177, 92, 238, 131, 20, 154, 5, 81, 183, 7, 155, 121, 66,
			// 		239, 88, 19, 76, 65, 239, 71, 62, 13, 180, 136, 78, 135, 197, 198,
			// 		184, 247, 10, 55, 188, 245, 75, 169, 223, 220, 89, 43, 38, 241, 178,
			// 		242, 15, 68, 117, 101, 182, 48, 188, 147, 177, 191, 179, 163, 67, 1,
			// 		181, 83, 64,
			// 	]),
			// 	new Uint8Array([
			// 		243, 112, 72, 250, 157, 212, 64, 22, 121, 150, 70, 135, 172, 32, 91,
			// 		13, 134, 228, 101, 189, 123, 12, 131, 150, 35, 210, 184, 3, 118, 200,
			// 		135, 156,
			// 	]),
			// ),
			peerId: await createEd25519PeerId(),
			dns: DNS,
			addresses: {
				listen: ["/ip4/10.14.0.2/tcp/52453"],
			},
			transports: [
				tcp(),
				// webSockets(),
				// circuitRelayTransport({
				// 	discoverRelays: 1,
				// }),
			],
			connectionEncryption: [noise(), plaintext()],
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
				// ping: ping([
				// 	"/ip4/174.105.208.56/tcp/40001/p2p/12D3KooWP49mSuMJ3Z4VARZM5av5cxbHFAmd7kVk31XvyGjcVi8q",
				// 	"/ip4/174.105.208.56/tcp/40002/p2p/12D3KooWN4QE8uaE5EAJFXBduYaRaBDYkxNbCJMvxqT5H2gU6hhG",
				// ]),
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
		libp2p.services.pubsub.subscribe("SuperGenius");

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
