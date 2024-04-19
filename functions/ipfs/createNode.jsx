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
import {
	getPeer
} from "@dcdn/graphsync";
import { pipe } from "it-pipe";
import { sgns as sgnsBroadcast } from "data/protobuf/broadcast";
import { sgns as sgnsBcast } from "data/protobuf/bcast";
//import protobuf from "protobufjs";
import { v4 as uuidv4 } from 'uuid';
import { CID } from 'multiformats/cid'
import {Buffer} from "buffer";
const { Message, Message_Request, Message_Response, Message_Block } = require("/data/protobuf/message");
import { SGTransaction } from "/data/protobuf/SGTransaction";
import {encode} from "@dcdn/graphsync/node_modules/it-length-prefixed/dist/src/encode";
import {decode as readerDecode} from "@dcdn/graphsync/node_modules/it-length-prefixed/dist/src/decode";
import {decode as decodeCbor } from "cborg"
let node = null;

let requestout = 0;
const createNode = async () => {
	try {
		const { crdt: crdtBroadcast } = sgnsBroadcast;
		const { crdt: crdtBcast } = sgnsBcast;
		const { broadcasting } = crdtBroadcast;
		const { pb } = crdtBcast;
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
		let requestIdCounter = 0;

		const myEd25519PeerId = await createFromPrivKey(privateKey);
		const mydirectPeers = [
			// {
			// 	id: peerIdFromString(
			// 		"12D3KooWP49mSuMJ3Z4VARZM5av5cxbHFAmd7kVk31XvyGjcVi8q",
			// 	),
			// 	addrs: [multiaddr("/ip4/192.168.46.18/tcp/22453/p2p/12D3KooWP49mSuMJ3Z4VARZM5av5cxbHFAmd7kVk31XvyGjcVi8q")],
			// },
			{
				id: peerIdFromString(
					"12D3KooWCWg6MYQH27jt6BtWFUauDUKd3CEdNwYTt8RkXfwqBAAh",
				),
				addrs: [
					multiaddr(
						"/ip4/192.168.46.18/tcp/40002/p2p/12D3KooWCWg6MYQH27jt6BtWFUauDUKd3CEdNwYTt8RkXfwqBAAh",
					),
				],
			},
			// {
			// 	id: peerIdFromString(
			// 		"12D3KooWSyvmzbSVzDVKEZSeCbt4pQ8cWMWT4wESSaUGvir4FzPF",
			// 	),
			// 	addrs: [multiaddr("/ip4/192.168.46.18/tcp/52454/p2p/12D3KooWSyvmzbSVzDVKEZSeCbt4pQ8cWMWT4wESSaUGvir4FzPF")],
			// },
		];
		const opubptions = {
			//emitSelf: true,
			directPeers: mydirectPeers,
		};
		const libp2p = await create({
			peerId: myEd25519PeerId,
			dns: DNS,
			addresses: {
				listen: ["/ip4/0.0.0.0/tcp/52453"],
			},
			transports: [
				tcp(),
				// webSockets(),
				// circuitRelayTransport({
				// 	discoverRelays: 1,
				// }),
			],
			connectionEncryption: [plaintext()],
			streamMuxers: [yamux()],
			//peerDiscovery: [bootstrap(bootstrapConfig)],
			services: {
				pubsub: gossipsub(opubptions),
				// dht: kadDHT({
				// 	clientMode: true,
				// 	validators: {
				// 		ipns: ipnsValidator,
				// 	},
				// 	selectors: {
				// 		ipns: ipnsSelector,
				// 	},
				// }),
				identify: identify(),
				keychain: keychain(KeychainInit),
				ping: ping(),
				// ping: ping([
				// 	"/ip4/174.105.208.56/tcp/40001/p2p/12D3KooWP49mSuMJ3Z4VARZM5av5cxbHFAmd7kVk31XvyGjcVi8q",
				// 	"/ip4/174.105.208.56/tcp/40002/p2p/12D3KooWN4QE8uaE5EAJFXBduYaRaBDYkxNbCJMvxqT5H2gU6hhG",
				// ]),
			},
		});
		const keyPair = await createEd25519PeerId();
		const peerid2 = keyPair;
		const libp2p2 = await create({
			peerId: peerid2,
			addresses: {
				listen: ["/ip4/0.0.0.0/tcp/42453"],
			},
			streamMuxers: [mplex()],
			transports: [tcp()],
			connectionEncryption: [noise()],
		});
		//Graphsync
		//const exchange = new GraphSync(libp2p2, blockstore);

		console.log("line74: " + libp2p.getMultiaddrs()[0]);

		libp2p.addEventListener("connection:open", async (e) => {
			console.log("New connection opened:", e);

			//const peerInfo = libp2p.peerStore.get(e.peerId);

			// if (peerInfo) {
			// 	const connection = peerInfo.connections[0]; // Assuming the first connection is the one we are interested in
			// 	if (connection) {
			// 		console.log("Peer ID:", e.peerId);
			// 		console.log("Local peer ID:", libp2p.peerId);

			// 		// Fetch additional details from the connection object
			// 		const stat = await connection.getStats();
			// 		console.log("Protocol:", stat.protocol);
			// 		console.log("Latency:", stat.latency);
			// 		console.log("Bytes sent:", stat.muxer.bytesSent);
			// 		console.log("Bytes received:", stat.muxer.bytesReceived);
			// 		console.log("Stream count:", stat.muxer.streams);
			// 	}
			// }
		});

		libp2p.addEventListener("connection:close", async (e) => {
			console.log("Connection closed:", e);

			//const peerInfo = libp2p.peerStore.get(e.peerId);

			// if (peerInfo) {
			// 	const connection = peerInfo.connections[0]; // Assuming the first connection is the one we are interested in
			// 	if (connection) {
			// 		console.log("Peer ID:", e.peerId);
			// 		console.log("Local peer ID:", libp2p.peerId);

			// 		// Fetch additional details from the connection object
			// 		const stat = await connection.getStats();
			// 		console.log("Reason:", stat.stat.status);
			// 		console.log("Closed by:", stat.stat.by);
			// 		console.log("Duration:", stat.stat.duration);
			// 	}
			// }
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
		//libp2p2.handle("/ipfs/graphsync/2.0.0",respondHandler)
		const requestedCids = [];
		
		libp2p.services.pubsub.addEventListener("message", async (message) => {
			// console.log(
			// 	`${message.detail.topic}:`,
			// 	new TextDecoder().decode(message.detail.data),
			// );
			console.log("Messsssssssssssssage");
			try {
				const decodedTask = broadcasting.BroadcastMessage.decode(
					message.detail.data,
				);
				//console.log("Decoded Task Object:", decodedTask);
				//const buffer = decodedTask.data;
				//const cidString = decodedTask.data.toString('utf-8');
				//console.log("CID String:::: " + cidString);
				try {
					const cids = pb.CRDTBroadcast.decode(decodedTask.data);
					let requests = [];
					for (const head of cids.heads) {
						if(!requestedCids.includes(String(head.cid)))
						{
							requestout = 1;
							requestedCids.push(String(head.cid));
							console.log(`Head: ${head.cid}`);
							console.log("Addresss : " + decodedTask.multiaddress);
							const provider = getPeer(decodedTask.multiaddress);
							console.log("ID CHECK:::" + provider.id);
							libp2p2.peerStore.merge(provider.id, {
								multiaddrs: provider.multiaddrs
							});
							requests.push(MakeRequest(head.cid,requestIdCounter));
							requestIdCounter++;
							requestedCids.push(head.cid);

						}
						if(requests.length > 0)
						{
							const provider = getPeer(decodedTask.multiaddress);
							const stream = await libp2p2.dialProtocol(
								provider.id,
								"/ipfs/graphsync/2.0.0",
							);
							await pipe(
								[MakeGSMessage(requests)],
								stream,respondHandler
							);
						}

					}
				} catch (err) {
					console.log("can't decode CIDs:" + err);
				}
			} catch (err) {
				console.log("can'tdecode:");
			}
		});
		libp2p.services.pubsub.subscribe("CRDT.Datastore.TEST.Channel");

		//libp2p.services.pubsub.publish(
		//	"CRDT.Datastore.TEST.Channel",
		//	new TextEncoder().encode("banana"),
		//);

		setInterval(() => {
			const peerList = libp2p.services.pubsub.getSubscribers(
				"CRDT.Datastore.TEST.Channel",
			);
			//libp2p.services.pubsub.publish(
			//	"CRDT.Datastore.TEST.Channel",
			//	new TextEncoder().encode("banana"),
			//);
			console.log(blockstore.getAll());
			console.log(peerList);
		}, 3000);
	} catch (err) {
		console.log(err);
	}
};
function respondHandler(source) {
	console.log('Incoming message received!')
	console.log('Stream:', source)

	
	// Handle the incoming message here
	// For example, you can listen to the stream for incoming data
    ;(async () => {
		let uint8Decode = new Uint8Array();
		//console.log("SOURCE:" + source)
		for await (const chunk of readerDecode()(source)) {
			const message = Message.fromBinary(chunk.slice());
			console.log('Decoded message:', message);
			for(const item of message.data)
			{
				//console.log(item.prefix.toString());
				try{
					const dag = SGTransaction.DAGStruct.decode(item.data)
					console.log("Daggg:" + dag.type);
					console.log("Daggg:" + dag.previous_hash);
					console.log("Daggg:" + dag.source_addr);
					console.log("Daggg:" + dag.nonce);
					console.log("Daggg:" + dag.timestamp);
				} catch(e)
				{
					console.log("woww:" + e);
				}

			}
        }        
    })()
  }
function MakeRequest( base58cid, requestIdCounter )
{
	const root = CID.parse(String(base58cid))

	const request = {
		id: requestIdCounter,
		root: root.bytes,
		selector: new Uint8Array([0xa1, 0x61, 0x2e, 0xa0]),
		extensions: {},
		priority: 1,
		cancel: false,
		update: false,
	}
	return request;
}

function MakeGSMessage(requests)
{
	const message = {
		completeRequestList: true,
		requests: requests,
		responses: [],
		data: [],
	}
	const binarymsg = Message.toBinary(message);

	const buffer = Buffer.from(binarymsg);

	const decodeTest = Message.fromBinary(binarymsg);

	return encode.single(buffer);	
}


const processBlocks = async (cid, selector, providerId) => {
	console.log("Process Blocks");
};

export default createNode;
