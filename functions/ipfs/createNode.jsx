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
//import { PeerId, Ed25519PeerId } from "@libp2p/interface";
import { PublicKey, PrivateKey } from "@libp2p/interface";
import { peerIdFromString } from "@libp2p/peer-id";
import {
	createEd25519PeerId,
	createFromPrivKey,
} from "@libp2p/peer-id-factory";
import { DNS } from "@multiformats/dns";
import { plaintext } from "@libp2p/plaintext";
import {
	generateKeyPair,
	marshalPrivateKey,
	unmarshalPrivateKey,
	marshalPublicKey,
	unmarshalPublicKey,
} from "@libp2p/crypto/keys";
import { peerIdFromKeys, peerIdFromBytes } from "@libp2p/peer-id";
import { multiaddr } from "@multiformats/multiaddr";
import { Ed25519PrivateKey } from "@libp2p/crypto/keys";
import { logger } from "@libp2p/logger";

let node = null;

const createNode = async () => {
	try {
		const blockstore = new MemoryBlockstore();
		const datastore = new MemoryDatastore();
		//const keyPair = await createEd25519PeerId();
		//const myEd25519PeerId = keyPair;
		const publicKeyBytes = new Uint8Array([
			241, 63, 188, 197, 210, 57, 246, 51, 214, 56, 128, 62, 140, 200, 94, 154,
			254, 154, 114, 80, 146, 242, 148, 101, 69, 160, 153, 3, 206, 171, 137,
			145,
		]);
		const privateKeyBytes = new Uint8Array([
			160, 235, 133, 48, 113, 183, 229, 39, 252, 154, 199, 184, 21, 171, 179,
			88, 137, 11, 81, 55, 16, 123, 228, 124, 58, 10, 12, 94, 153, 101, 34, 122,
			241, 63, 188, 197, 210, 57, 246, 51, 214, 56, 128, 62, 140, 200, 94, 154,
			254, 154, 114, 80, 146, 242, 148, 101, 69, 160, 153, 3, 206, 171, 137,
			145,
		]);
		const privateKey = new Ed25519PrivateKey(privateKeyBytes, publicKeyBytes);
		//const key = await generateKeyPair('Ed25519', 1024);
		//const key = new PrivateKey();

		const myEd25519PeerId = await createFromPrivKey(privateKey);
		const mydirectPeers = [
			{
				id: peerIdFromString(
					"12D3KooWP49mSuMJ3Z4VARZM5av5cxbHFAmd7kVk31XvyGjcVi8q",
				),
				addrs: [multiaddr("/ip4/192.168.46.18/tcp/40001")],
			},
			{
				id: peerIdFromString(
					"12D3KooWN4QE8uaE5EAJFXBduYaRaBDYkxNbCJMvxqT5H2gU6hhG",
				),
				addrs: [multiaddr("/ip4/192.168.46.18/tcp/40002")],
			},
		];
		const opubptions = {
			emitSelf: true,
			directPeers: mydirectPeers,
		};
		const libp2p = await create({
			peerId: myEd25519PeerId,
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
			streamMuxers: [yamux(), mplex()],
			peerDiscovery: [bootstrap(bootstrapConfig)],
			services: {
				pubsub: gossipsub(opubptions),
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
				ping: ping(),
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

		libp2p.addEventListener("connection:open", () => {
			console.log("opened" + node.libp2p.getPeers().length);
		});
		libp2p.addEventListener("connection:close", () => {
			console.log("closed" + node.libp2p.getPeers().length);
		});

		libp2p.addEventListener("connection:open", async (e) => {
			console.log("New connection opened:", e);

			const peerInfo = libp2p.peerStore.get(e.peerId);

			if (peerInfo) {
				const connection = peerInfo.connections[0]; // Assuming the first connection is the one we are interested in
				if (connection) {
					console.log("Peer ID:", e.peerId);
					console.log("Local peer ID:", libp2p.peerId);

					// Fetch additional details from the connection object
					const stat = await connection.getStats();
					console.log("Protocol:", stat.protocol);
					console.log("Latency:", stat.latency);
					console.log("Bytes sent:", stat.muxer.bytesSent);
					console.log("Bytes received:", stat.muxer.bytesReceived);
					console.log("Stream count:", stat.muxer.streams);
				}
			}
		});

		libp2p.addEventListener("connection:close", async (e) => {
			console.log("Connection closed:", e);

			const peerInfo = libp2p.peerStore.get(e.peerId);

			if (peerInfo) {
				const connection = peerInfo.connections[0]; // Assuming the first connection is the one we are interested in
				if (connection) {
					console.log("Peer ID:", e.peerId);
					console.log("Local peer ID:", libp2p.peerId);

					// Fetch additional details from the connection object
					const stat = await connection.getStats();
					console.log("Reason:", stat.stat.status);
					console.log("Closed by:", stat.stat.by);
					console.log("Duration:", stat.stat.duration);
				}
			}
		});

		libp2p.addEventListener("peer:discovery", (e) => {
			console.log("New peer discovered:", e);
			console.log("Peer ID:", e.peerId);
		});

		libp2p.addEventListener("peer:connect", (e) => {
			console.log("Peer connected:", e);
			console.log("Peer ID:", e.peerId);
		});

		libp2p.addEventListener("peer:disconnect", (e) => {
			console.log("Peer disconnected:", e);
			console.log("Peer ID:", e.peerId);
		});

		libp2p.addEventListener("peer:connect:error", (e) => {
			console.log("Error connecting to peer:", e);
			console.log("Peer ID:", e.peerId);
		});

		libp2p.addEventListener("peer:connect:abort", (e) => {
			console.log("Connection attempt to peer aborted:", e);
			console.log("Peer ID:", e.peerId);
		});

		libp2p.addEventListener("peer:connect:timeout", (e) => {
			console.log("Connection attempt to peer timed out:", e);
			console.log("Peer ID:", e.peerId);
		});

		libp2p.services.pubsub.addEventListener("message", (message) => {
			console.log(
				`${message.detail.topic}:`,
				new TextDecoder().decode(message.detail.data),
			);
		});
		libp2p.services.pubsub.subscribe("SuperGenius");

		libp2p.services.pubsub.publish(
			"SuperGenius",
			new TextEncoder().encode("banana"),
		);

		setInterval(() => {
			const peerList = libp2p.services.pubsub.getSubscribers();
			libp2p.services.pubsub.publish(
				"SuperGenius",
				new TextEncoder().encode("banana"),
			);
			console.log(peerList);
		}, 3000);
	} catch (err) {
		console.log(err);
	}
};

export default createNode;
