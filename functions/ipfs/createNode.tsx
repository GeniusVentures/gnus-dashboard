import koffi from 'koffi';
import path from 'path';
const {
	DAGStruct,
	DAGWrapper,
	TransferTx,
	ProcessingTx,
	MintTx,
	EscrowTx,
	UTXOTxParams,
	TransferOutput,
	TransferUTXOInput,
} = require("data/protobuf/SGTransaction");
const {
	Delta, 
	Element
} = require("data/protobuf/delta");
const {
	BlockID,
	BlockHashData,
	BlockHeaderData,
	BlockPayloadData,
} = require("data/protobuf/SGBlocks");
import transferMsg from "../../functions/messages/transfer";
import mintMsg from "../../functions/messages/mint";
import processingMsg from "../../functions/messages/processing";
import blockMsg from "../../functions/messages/block";
import escrowMsg from "../../functions/messages/escrow";

let libraryPath;
const basePath = path.join(process.cwd(), 'data'); // Base path relative to project root
switch (process.platform) {
  case 'win32':
    libraryPath = path.join(basePath, 'GeniusSDK.dll');
    break;
  case 'darwin':
    libraryPath = path.join(basePath, 'libGeniusSDK.dylib');
    break;
  case 'linux':
    libraryPath = path.join(basePath, 'libGeniusSDK.so');
    break;
  default:
    throw new Error(`Unsupported platform: ${process.platform}`);
}

console.log('Library path resolved to:', libraryPath);
const GeniusSDK = koffi.load(libraryPath);

// Define GeniusArray and GeniusMatrix types
const GeniusArray = koffi.struct('GeniusArray', {
	size: 'uint64_t',
	ptr: koffi.pointer('uint8_t'), // Pointer to uint8_t (byte array)
  });
  
  const GeniusMatrix = koffi.struct('GeniusMatrix', {
	size: 'uint64_t',
	ptr: koffi.pointer(GeniusArray), // Pointer to GeniusArray
  });
  const GeniusAddress = koffi.struct('GeniusAddress', {
	address: koffi.array('char', 32), // Assuming a fixed size of 32 bytes for the address
  });

const GeniusSDKInit = GeniusSDK.func('const char* GeniusSDKInit(const char*, const char*)');
const GeniusSDKProcess = GeniusSDK.func('void GeniusSDKProcess(const char*)');
const GeniusSDKGetBalance = GeniusSDK.func('uint64_t GeniusSDKGetBalance()');
const GeniusSDKGetTransactions = GeniusSDK.func('GeniusMatrix GeniusSDKGetTransactions()');
const GeniusSDKGetBlocks = GeniusSDK.func('GeniusMatrix GeniusSDKGetBlocks()');
const GeniusSDKFreeTransactions = GeniusSDK.func('void GeniusSDKFreeTransactions(GeniusMatrix)');
const GeniusSDKMintTokens = GeniusSDK.func('void GeniusSDKMintTokens(uint64_t)');
const GeniusSDKGetAddress = GeniusSDK.func('GeniusAddress GeniusSDKGetAddress()');
const GeniusSDKTransferTokens = GeniusSDK.func('bool GeniusSDKTransferTokens(uint64_t, GeniusAddress*)');
const GeniusSDKGetCost = GeniusSDK.func('uint64_t GeniusSDKGetCost(const char*)');

export const initGnus = GeniusSDKInit;
export const processGnus = GeniusSDKProcess;
export const getBalance = GeniusSDKGetBalance;
export const getTransactions = GeniusSDKGetTransactions;
export const getBlocks = GeniusSDKGetBlocks;
export const freeTransactions = GeniusSDKFreeTransactions;
export const mintTokens = GeniusSDKMintTokens;
export const getAddress = GeniusSDKGetAddress;
export const transferTokens = GeniusSDKTransferTokens;
export const getCost = GeniusSDKGetCost;

let node = null;

let requestout = 0;
let transactionList = [];
let blockList = [];
const createNode = async () => {
	try {
		// Set up the required base path and Ethereum private key
		const basePath = path.join(process.cwd(), 'data') + "/"; 
		const ethPrivateKey = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'; // Replace with the actual private key

		// Initialize GeniusSDK
		const result = GeniusSDKInit(basePath, ethPrivateKey);

		if (!result) {
			throw new Error('GeniusSDK initialization failed');
		}

		console.log('GeniusSDK initialized successfully:', result);

		node = { initialized: true, details: result };
	} catch (e) {
		console.error('Error initializing GeniusSDK:', e);
	}

	//console.log('Balance:', getBalance());

	CheckTransactions();
	CheckBlocks();
	//mintTokens(1000);
	//console.log('Address:', getAddress());
};


function CheckTransactions() {
	const transactions = getTransactions();

	// Decode the GeniusArray collection
	const geniusArrays = koffi.decode(transactions.ptr, GeniusArray, transactions.size);
	
	// Loop through each GeniusArray entry
	for (let i = 0; i < transactions.size; i++) {
		const entry = geniusArrays[i]; // Get each GeniusArray entry
		const dataBuffer = koffi.decode(entry.ptr, 'uint8_t', entry.size); // Decode the raw data
	  
		// Check if dataBuffer already exists in transactionList
		const exists = transactionList.some(existingBuffer => 
			existingBuffer.length === dataBuffer.length &&
			existingBuffer.every((value, index) => value === dataBuffer[index])
		  );

		if (!exists) {
		  transactionList.push(dataBuffer); 
		  ParseTransaction(dataBuffer); 
		}
	}
	console.log('Readable Transactions:', transactionList);

	// Free memory for transactions
	freeTransactions(transactions);
}

function CheckBlocks() {
	const transactions = getBlocks();

	// Decode the GeniusArray collection
	const geniusArrays = koffi.decode(transactions.ptr, GeniusArray, transactions.size);
	
	// Loop through each GeniusArray entry
	for (let i = 0; i < transactions.size; i++) {
		const entry = geniusArrays[i]; // Get each GeniusArray entry
		const dataBuffer = koffi.decode(entry.ptr, 'uint8_t', entry.size); // Decode the raw data
	  
		// Check if dataBuffer already exists in transactionList
		const exists = transactionList.some(existingBuffer => 
			existingBuffer.length === dataBuffer.length &&
			existingBuffer.every((value, index) => value === dataBuffer[index])
		  );

		if (!exists) {
			blockList.push(dataBuffer); 
			ParseBlock(dataBuffer); 
		}
	}
	console.log('Readable Blocks:', blockList);

	// Free memory for transactions
	freeTransactions(transactions);
}

function ParseTransaction(transactionData: Uint8Array) {
	//Try Decoding as Mint
	try{
		const mint = MintTx.fromBinary(transactionData);
		console.log("Mint Message: " + mint.amount);
		mintMsg(mint);
		return;
	}
	catch(e)
	{
		console.log("Cannot Decode as mint" + e)
	}
	//Try decoding as processing
	try{
		const processing = ProcessingTx.fromBinary(transactionData);
		processingMsg(processing);
		return;
	}
	catch(e)
	{
		console.log("Cannot Decode as processing" + e)
	}
	//Try decoding as Escrow
	try{
		const escrow = EscrowTx.fromBinary(transactionData);
		escrowMsg(escrow);
		return;
	}
	catch(e)
	{
		console.log("Cannot Decode as escrow" + e)
	}
	//Try decoding as transfer
	try{
		const transfer = TransferTx.fromBinary(transactionData);
		transferMsg(transfer);
		return;
	}
	catch(e)
	{
		console.log("Cannot Decode as transfer" + e)
	}
	//Try Decoding as Block TX
	// try{
	// 	const block = BlockPayloadData.fromBinary(transactionData);
	// 	blockMsg(block);
	// 	return;
	// }
	// catch(e)
	// {
	// 	console.log("Cannot Decode as block tx" + e)
	// }
}

function ParseBlock(transactionData: Uint8Array) {
	//Try Decoding as Block Header
	try{
		const block = BlockHeaderData.fromBinary(transactionData);
		console.log(" Block Message ");
		console.log("Parent Hash: " + block.parentHash);
		console.log("Block Number: " + block.blockNumber);
		console.log("stateRoot: " + block.stateRoot);
		console.log("Extrin Root: " + block.extrinsicsRoot);
		console.log("digest: " + block.digest);
		blockMsg(block);
		return;
	}
	catch(e)
	{
		console.log("Cannot Decode as block tx" + e)
	}
}

function runGeniusSDKProcess(jsonData) {
	try {
	  // Ensure parameters are valid
	  if (typeof jsonData !== 'string') {
		throw new Error('Invalid arguments: jsonData must be a string');
	  }
  
	  // Call the GeniusSDKProcess C function
	  GeniusSDKProcess(jsonData); // Convert amount to BigInt if needed for C compatibility
  
	  console.log(`Processed successfully: JSON Data=${jsonData}`);
	} catch (error) {
	  console.error(`Error running GeniusSDKProcess: ${error.message}`);
	}
  }

export default createNode;
