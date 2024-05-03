import { createHelia } from "helia";
import { tcp } from "@libp2p/tcp";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { bootstrap } from "@libp2p/bootstrap";
import { identify } from "@libp2p/identify";
import {
	kadDHT,
	MessageType,
	QueryEvent,
	DHTProgressEvents,
	SendQueryEvent,
	removePrivateAddressesMapper,
} from "@libp2p/kad-dht";
import { keychain } from "@libp2p/keychain";
import { mplex } from "@libp2p/mplex";
import { ping } from "@libp2p/ping";
import { webSockets } from "@libp2p/websockets";
import { ipnsSelector } from "ipns/selector";
import { ipnsValidator } from "ipns/validator";
import { bootstrapConfig } from "../../data/ipfs/bootstrapConfig";
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
import { dns } from "@multiformats/dns";
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
import { getPeer } from "@dcdn/graphsync";
import { pipe } from "it-pipe";
import { sgns as sgnsBroadcast } from "../../data/protobuf/broadcast";
import { sgns as sgnsBcast } from "../../data/protobuf/bcast";
import { Delta, Element } from "../../data/protobuf/delta";
//import protobuf from "protobufjs";
import { v4 as uuidv4 } from "uuid";
import { CID } from "multiformats/cid";
import { Buffer } from "buffer";
const {
	Message,
	Message_Request,
	Message_Response,
	Message_Block,
} = require("data/protobuf/message");
const {
	BlockHashData,
	BlockHeaderData,
	BlockPayloadData,
} = require("data/protobuf/SGBlocks");
const {
	DAGStruct,
	DAGWrapper,
	TransferTx,
	ProcessingTx,
	MintTx,
} = require("data/protobuf/SGTransaction");
import { encode } from "@dcdn/graphsync/node_modules/it-length-prefixed/dist/src/encode";
import { decode as readerDecode } from "@dcdn/graphsync/node_modules/it-length-prefixed/dist/src/decode";
import { decode as decodeCbor } from "cborg";
import * as dagPB from "@ipld/dag-pb";
import transferMsg from "../../functions/messages/transfer";
import mintMsg from "../../functions/messages/mint";
import processingMsg from "../../functions/messages/processing";
import blockMsg from "../../functions/messages/block";
import { sha256 } from "multiformats/hashes/sha2";

let node = null;

let requestout = 0;
const createNode = async () => {
	try {
		const { crdt: crdtBroadcast } = sgnsBroadcast;
		const { crdt: crdtBcast } = sgnsBcast;
		const { broadcasting } = crdtBroadcast;
		const { pb: pbBcast } = crdtBcast;

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
			// {
			// 	id: peerIdFromString(
			// 		"12D3KooWCWg6MYQH27jt6BtWFUauDUKd3CEdNwYTt8RkXfwqBAAh",
			// 	),
			// 	addrs: [
			// 		multiaddr(
			// 			"/ip4/192.168.46.18/tcp/40002/p2p/12D3KooWCWg6MYQH27jt6BtWFUauDUKd3CEdNwYTt8RkXfwqBAAh",
			// 		),
			// 	],
			// },
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
			dns: dns(),
			addresses: {
				listen: ["/ip4/10.14.0.2/tcp/64085"],
			},
			transports: [
				tcp(),
				// webSockets(),
				// circuitRelayTransport({
				// 	discoverRelays: 1,
				// }),
			],
			connectionEncryption: [plaintext(), noise()],
			streamMuxers: [yamux(), mplex()],
			peerDiscovery: [bootstrap(bootstrapConfig)],
			services: {
				pubsub: gossipsub(opubptions),
				dht: kadDHT({
					//findProviders: //key goes here I'm pretty sure
					protocol: "/ipfs/kad/1.0.0",
					clientMode: true,
				}),
				identify: identify(),
				keychain: keychain(),
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

		// libp2p.addEventListener("connection:open", async (e) => {
		// 	console.log("New connection opened:", e);

		// 	//const peerInfo = libp2p.peerStore.get(e.peerId);

		// 	// if (peerInfo) {
		// 	// 	const connection = peerInfo.connections[0]; // Assuming the first connection is the one we are interested in
		// 	// 	if (connection) {
		// 	// 		console.log("Peer ID:", e.peerId);
		// 	// 		console.log("Local peer ID:", libp2p.peerId);

		// 	// 		// Fetch additional details from the connection object
		// 	// 		const stat = await connection.getStats();
		// 	// 		console.log("Protocol:", stat.protocol);
		// 	// 		console.log("Latency:", stat.latency);
		// 	// 		console.log("Bytes sent:", stat.muxer.bytesSent);
		// 	// 		console.log("Bytes received:", stat.muxer.bytesReceived);
		// 	// 		console.log("Stream count:", stat.muxer.streams);
		// 	// 	}
		// 	// }
		// });

		// libp2p.addEventListener("connection:close", async (e) => {
		// 	console.log("Connection closed:", e);

		// 	//const peerInfo = libp2p.peerStore.get(e.peerId);

		// 	// if (peerInfo) {
		// 	// 	const connection = peerInfo.connections[0]; // Assuming the first connection is the one we are interested in
		// 	// 	if (connection) {
		// 	// 		console.log("Peer ID:", e.peerId);
		// 	// 		console.log("Local peer ID:", libp2p.peerId);

		// 	// 		// Fetch additional details from the connection object
		// 	// 		const stat = await connection.getStats();
		// 	// 		console.log("Reason:", stat.stat.status);
		// 	// 		console.log("Closed by:", stat.stat.by);
		// 	// 		console.log("Duration:", stat.stat.duration);
		// 	// 	}
		// 	// }
		// });

		// libp2p.addEventListener("peer:discovery", (e) => {
		// 	console.log("New peer discovered:", e);
		// });

		// libp2p.addEventListener("peer:connect", (e) => {
		// 	console.log("Peer connected:", e);
		// });

		// libp2p.addEventListener("peer:disconnect", (e) => {
		// 	console.log("Peer disconnected:", e);
		// });

		//libp2p2.handle("/ipfs/graphsync/2.0.0",respondHandler)
		const requestedCids: [] = [];

		// Subscribe to query events

		libp2p.services.pubsub.addEventListener("message", async (message: any) => {
			// console.log(
			// 	`${message.detail.topic}:`,
			// 	new TextDecoder().decode(message.detail.data),
			// );
			const multiaddr = message.detail.from;
			const peerstoreres = libp2p.peerStore.get(multiaddr);
			const addresses = (await peerstoreres).addresses;
			let ipv4Address = "";
			for (const addr of addresses) {
				if (addr.multiaddr.toString().includes("/ip4/")) {
					ipv4Address = addr.multiaddr.toString();
					break;
				}
			}
			console.log("Source multiaddress:", ipv4Address);
			const ipv4Regex = /\/ip4\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/;
			const match = ipv4Address.match(ipv4Regex);
			let extractedIPv4 = "";
			if (match) {
				extractedIPv4 = match[1]; // Extracted IPv4 address
				console.log("Extracted IPv4 address:", extractedIPv4);
			} else {
				console.log("No IPv4 address found in the multiaddress:", ipv4Address);
			}
			//console.log("Peerstore result: " + (await peerstoreres).addresses.at(0).multiaddr);
			console.log("Source multiaddress:", extractedIPv4);
			try {
				const decodedTask = broadcasting.BroadcastMessage.decode(
					message.detail.data,
				);
				//console.log("Decoded Task Object:", decodedTask);
				//const buffer = decodedTask.data;
				//const cidString = decodedTask.data.toString('utf-8');
				//console.log("CID String:::: " + cidString);
				try {
					const cids = pbBcast.CRDTBroadcast.decode(decodedTask.data);
					let requests: string[] = [];
					for (const head of cids.heads) {
						if (
							!requestedCids.includes(String(head.cid)) &&
							extractedIPv4.length > 0
						) {
							requestout = 1;
							requestedCids.push(String(head.cid));
							console.log(`Head: ${head.cid}`);
							console.log("Addresss : " + decodedTask.multiaddress);
							// decodedTask.multiaddress = decodedTask.multiaddress.replace(
							// 	"192.168.46.18",
							// 	"174.105.208.56",
							// );
							const replacedAddr = decodedTask.multiaddress.replace(
								"[IP]",
								extractedIPv4,
							);
							const provider = getPeer(replacedAddr);
							console.log("ID CHECK:::" + provider.id);
							libp2p2.peerStore.merge(provider.id, {
								multiaddrs: provider.multiaddrs,
							});
							requests.push(MakeRequest(head.cid, requestIdCounter));
							requestIdCounter++;
							requestedCids.push(head.cid);
						}
						if (requests.length > 0) {
							const replacedAddr = decodedTask.multiaddress.replace(
								"[IP]",
								extractedIPv4,
							);
							const provider = getPeer(replacedAddr);
							const stream = await libp2p2.dialProtocol(
								provider.id,
								"/ipfs/graphsync/2.0.0",
							);
							await pipe([MakeGSMessage(requests)], stream, respondHandler);
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
		//const input = new TextEncoder().encode("SuperGenius");
		//const digest = await sha256.digest(input);

		//const cidtofind = CID.createV0(digest);
		//const cidtofind = CID.parse("QmSnuWmxptJZdLJpKRarxBMS2Ju2oANVrgbr2xWbie9b2D");
		const cidtofind = CID.parse(
			"QmeTbk3jEuY9Yyfcmum87v1qd8aFFeqcWfpYqt65bSQGEZ",
		);
		console.log("Cid to find:" + cidtofind.toString());

		const provider = libp2p.services.dht.findProviders(cidtofind);

		for await (const event of provider) {
			//console.log("Providers Event:::" + event.name);
			switch (event.name) {
				case "SEND_QUERY":
					// Handle SendQueryEvent
					break;
				case "PEER_RESPONSE":
					// Handle PeerResponseEvent
					break;
				case "FINAL_PEER":
					// Handle FinalPeerEvent
					//console.log("Final Peer:::" + event.from);
					break;
				case "QUERY_ERROR":
					// Handle QueryErrorEvent
					//console.log("Query Error:::" + event.error);
					break;
				case "PROVIDER":
					// Handle ProviderEvent
					console.log(
						"Provider Given:" +
							event.providers[0].id +
							"Multiaddr" +
							event.providers[0].multiaddrs,
					);
					break;
				case "VALUE":
					// Handle ValueEvent
					//console.log("Value Event? " + event.from);
					break;
				case "ADD_PEER":
					// Handle AddPeerEvent
					break;
				case "DIAL_PEER":
					// Handle DialPeerEvent
					break;
				default:
					// Handle unknown event
					console.log("Unknown Event");
					break;
			}
		}

		setInterval(() => {
			const peerList = libp2p.services.pubsub.getSubscribers(
				"CRDT.Datastore.TEST.Channel",
			);

			//libp2p.services.pubsub.publish(
			//	"CRDT.Datastore.TEST.Channel",
			//	new TextEncoder().encode("banana"),
			//);
			//checkDHT(provider);
			//console.log(blockstore.getAll());
			//console.log(peerList);
		}, 3000);
	} catch (err) {
		console.log(err);
	}
};

function respondHandler(source: any) {
	console.log("Incoming message received!");
	console.log("Stream:", source);

	// Handle the incoming message here
	// For example, you can listen to the stream for incoming data
	(async () => {
		let uint8Decode = new Uint8Array();
		//console.log("SOURCE:" + source)
		for await (const chunk of readerDecode()(source)) {
			const message = Message.fromBinary(chunk.slice());
			//console.log('Decoded message:', message);
			for (const item of message.data) {
				//console.log(item.prefix.toString());
				//console.log(item.data);
				//const ipld = dagPB.decode(item.data)
				try {
					const decodedData = dagPB.decode(item.data);
					// console.log("TESt: " + decodedData);
					// console.log("TESt: " + decodedData.Data);
					// console.log("TESt: " + decodedData.Links[0].Hash);
					// console.log("TESt: " + decodedData.Links[0].Name);
					// console.log("TESt: " + decodedData.Links[0].Tsize);
					// try{
					// 	const block = BlockPayloadData.fromBinary(decodedData.Data);
					// } catch(e)
					// {
					// 	console.log("Payload Fail");
					// }
					// try{
					// 	const block = BlockHeaderData.fromBinary(decodedData.Data);
					// } catch(e)
					// {
					// 	console.log("Header Fail");
					// }
					// try{
					// 	const dag = SGTransaction.DAGStruct.decode(decodedData.Data)
					// 	console.log("Daggg type:" + dag.type);
					// 	console.log("Daggg Prev:" + dag.previous_hash);
					// 	console.log("Daggg Source:" + dag.source_addr);
					// 	console.log("Daggg None:" + dag.nonce);
					// 	console.log("Daggg Timestamp:" + dag.timestamp);
					// 	console.log("Daggg Uncle:" + dag.uncle_hash);
					// 	console.log("Daggg Data:" + dag.data_hash);
					// } catch(e)
					// {
					// 	console.log("DAg fail");
					// }

					try {
						const delta = Delta.fromBinary(decodedData.Data);

						for (const elementin of delta.elements) {
							// console.log("Element Key:" + elementin.key);
							// console.log("Element data:" + elementin.id);
							// console.log("Element data:" + elementin.value);
							//Transfer
							if (elementin.key.includes("transfer")) {
								console.log("Transfer");
								try {
									const transfer = TransferTx.fromBinary(elementin.value);
									// console.log("Transfer:" + transfer.tokenId);
									// console.log("Transfer:" + transfer.encryptedAmount);
									// console.log("Transfer:" + transfer.destAddr);
									// console.log("Transfer:" + transfer.dagStruct.type);
									// console.log("Transfer:" + transfer.dagStruct.previousHash);
									// console.log("Transfer:" + transfer.dagStruct.sourceAddr);
									// console.log("Transfer:" + transfer.dagStruct.nonce);
									// console.log("Transfer:" + transfer.dagStruct.timestamp);
									// console.log("Transfer:" + transfer.dagStruct.uncleHash);
									// console.log("Transfer:" + transfer.dagStruct.dataHash);
									transferMsg(transfer, elementin.key);
								} catch (e) {
									console.log("Transfer error: " + e.message);
								}
							}
							//Mint
							if (elementin.key.includes("mint")) {
								console.log("Mint");
								try {
									const mint = MintTx.fromBinary(elementin.value);
									// console.log("Mint: " + mint.amount);
									// console.log("Mint:" + mint.dagStruct.previousHash);
									// console.log("Mint:" + mint.dagStruct.sourceAddr);
									// console.log("Mint:" + mint.dagStruct.nonce);
									// console.log("Mint:" + mint.dagStruct.timestamp);
									// console.log("Mint:" + mint.dagStruct.uncleHash);
									// console.log("Mint:" + mint.dagStruct.dataHash);
									mintMsg(mint, elementin.key);
								} catch (e) {
									console.log("Mint error: " + e.message);
								}
							}
							//Blockchain
							if (elementin.key.includes("blockchain")) {
								console.log("Blockchain");
								if (elementin.key.includes("tx")) {
									console.log("blockchain tx");
									try {
										const block = BlockPayloadData.fromBinary(elementin.value);
										// console.log("Block TX" + block.hash);
										// console.log("Block TX" + block.header);
										// console.log("Block TX" + block.blockBody);
										// console.log("Block TX" + block.header.parentHash);
										// console.log("Block TX" + block.header.blockNumber);
										// console.log("Block TX" + block.header.stateRoot);
										// console.log("Block TX" + block.header.extrinsicsRoot);
										// console.log("Block TX" + block.header.digest);
										// console.log("Block? " + block.block_body);
										// blockMsg(block, elementin.key);
									} catch (e) {
										console.log("Block TX Fail: " + e.message);
									}
								} else {
									try {
										const block = BlockHeaderData.fromBinary(elementin.value);
										// console.log("BlockHeader" + block.parentHash);
										// console.log("BlockHeader" + block.blockNumber);
										// console.log("BlockHeader" + block.stateRoot);
										// console.log("BlockHeader" + block.extrinsicsRoot);
										// console.log("BlockHeader" + block.digest);
										blockMsg(block, elementin.key);
									} catch (e) {
										console.log("Block Fail: " + e.message);
									}
								}
							}
							//Processing
							if (elementin.key.includes("processing")) {
								try {
									const processing = ProcessingTx.fromBinary(elementin.value);
									// console.log("Proc:" + processing.mpcMagicKey);
									// console.log("Proc:" + processing.offset);
									// console.log("Proc:" + processing.jobCid);
									// console.log("Proc:" + processing.subtaskCid);
									// console.log("Proc:" + processing.dagStruct.previousHash);
									// console.log("Proc:" + processing.dagStruct.sourceAddr);
									// console.log("Proc:" + processing.dagStruct.nonce);
									// console.log("Proc:" + processing.dagStruct.timestamp);
									// console.log("Proc:" + processing.dagStruct.uncleHash);
									// console.log("Proc:" + processing.dagStruct.dataHash);
									processingMsg(processing, elementin.key);
								} catch (e) {
									console.log("Proc error");
								}
							}
						}
						//console.log("Delta: " + delta.elements[0].key);
						//console.log("Delta: " + delta.priority);
					} catch (e) {
						console.log("Delta Error" + e);
					}
				} catch (e) {
					console.log("DAGERROR : " + e);
				}
			}
		}
	})();
}
function MakeRequest(base58cid: Uint8Array, requestIdCounter: number) {
	const root = CID.parse(String(base58cid));

	const request: any = {
		id: requestIdCounter,
		root: root.bytes,
		selector: new Uint8Array([0xa1, 0x61, 0x2e, 0xa0]),
		extensions: {},
		priority: 1,
		cancel: false,
		update: false,
	};
	return request;
}

function MakeGSMessage(requests) {
	const message = {
		completeRequestList: true,
		requests: requests,
		responses: [],
		data: [],
	};
	const binarymsg = Message.toBinary(message);

	const buffer = Buffer.from(binarymsg);

	const decodeTest = Message.fromBinary(binarymsg);

	return encode.single(buffer);
}

const processBlocks = async (cid, selector, providerId) => {
	console.log("Process Blocks");
};

export default createNode;
