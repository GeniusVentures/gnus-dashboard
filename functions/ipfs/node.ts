import koffi from "koffi";
import path from "path";
import { GeniusArray, getStruct, GeniusMatrix, GeniusAddress } from "./structs";

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
const { Delta, Element } = require("data/protobuf/delta");
const {
  BlockID,
  BlockHashData,
  BlockHeaderData,
  BlockPayloadData,
} = require("data/protobuf/SGBlocks");
import transferMsg from "../messages/transfer";
import mintMsg from "../messages/mint";
import processingMsg from "../messages/processing";
import blockMsg from "../messages/block";
import escrowMsg from "../messages/escrow";
import { get } from "http";

let libraryPath;
const basePath = path.join(process.cwd(), "data"); // Base path relative to project root
switch (process.platform) {
  case "win32":
    libraryPath = path.join(basePath, "GeniusSDK.dll");
    break;
  case "darwin":
    libraryPath = path.join(basePath, "libGeniusSDK.dylib");
    break;
  case "linux":
    libraryPath = path.join(basePath, "libGeniusSDK.so");
    break;
  default:
    throw new Error(`Unsupported platform: ${process.platform}`);
}

console.log("Library path resolved to:", libraryPath);
const GeniusSDK = koffi.load(libraryPath);

//Path, Key, Use DHT, Do processing
const GeniusSDKInit = GeniusSDK.func(
  "const char* GeniusSDKInit(const char*, const char*, int, int, int)"
);
const GeniusSDKProcess = GeniusSDK.func("void GeniusSDKProcess(const char*)");
const GeniusSDKGetBalance = GeniusSDK.func("uint64_t GeniusSDKGetBalance()");
const GeniusSDKGetOutTransactions = GeniusSDK.func(
  "GeniusMatrix GeniusSDKGetOutTransactions()"
);
const GeniusSDKGetInTransactions = GeniusSDK.func(
  "GeniusMatrix GeniusSDKGetInTransactions()"
);
//const GeniusSDKGetBlocks = GeniusSDK.func("GeniusMatrix GeniusSDKGetBlocks()");
const GeniusSDKFreeTransactions = GeniusSDK.func(
  "void GeniusSDKFreeTransactions(GeniusMatrix)"
);
const GeniusSDKMintTokens = GeniusSDK.func(
  "void GeniusSDKMintTokens(uint64_t, const char*, const char*, const char*)"
);
const GeniusSDKGetAddress = GeniusSDK.func(
  "GeniusAddress GeniusSDKGetAddress()"
);
const GeniusSDKTransferTokens = GeniusSDK.func(
  "bool GeniusSDKTransferTokens(uint64_t, GeniusAddress*)"
);
const GeniusSDKGetCost = GeniusSDK.func(
  "uint64_t GeniusSDKGetCost(const char*)"
);

const initGnus = GeniusSDKInit;
const processGnus = GeniusSDKProcess;
const getBalance = GeniusSDKGetBalance;
const getOutTransactions = GeniusSDKGetOutTransactions;
const getInTransactions = GeniusSDKGetInTransactions;
//const getBlocks = GeniusSDKGetBlocks;
const freeTransactions = GeniusSDKFreeTransactions;
const mintTokens = GeniusSDKMintTokens;
const getAddress = GeniusSDKGetAddress;
const transferTokens = GeniusSDKTransferTokens;
const getCost = GeniusSDKGetCost;

let node = null;

let requestout = 0;
let transactionOutList = [];
let transactionInList = [];
let blockList = [];
const createNode = async () => {
  try {
    // Set up the required base path and Ethereum private key
    const basePath = path.join(process.cwd(), "data") + "/";
    const ethPrivateKey =
      "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"; // Replace with the actual private key

    // Initialize GeniusSDK
    const result = GeniusSDKInit(basePath, ethPrivateKey,1,0,40001);

    if (!result) {
      throw new Error("GeniusSDK initialization failed");
    }

    console.log("GeniusSDK initialized successfully:", result);

    node = { initialized: true, details: result };
  } catch (e) {
    console.error("Error initializing GeniusSDK:", e);
  }
};

function CheckTransactions() {
  //Outgoing
  const outtransactions = getOutTransactions();

  // Decode the GeniusArray collection
  const outgeniusArrays = koffi.decode(
    outtransactions.ptr,
    GeniusArray,
    outtransactions.size
  );

  // Loop through each GeniusArray entry
  for (let i = 0; i < outtransactions.size; i++) {
    const entry = outgeniusArrays[i]; // Get each GeniusArray entry
    const dataBuffer = koffi.decode(entry.ptr, "uint8_t", entry.size); // Decode the raw data

    // Check if dataBuffer already exists in transactionList
    const exists = transactionOutList.some(
      (existingBuffer) =>
        existingBuffer.length === dataBuffer.length &&
        existingBuffer.every((value, index) => value === dataBuffer[index])
    );

    if (!exists) {
      transactionOutList.push(dataBuffer);
      ParseTransaction(dataBuffer);
    }
  }
  console.log("Readable Transactions Out:", transactionOutList);

  // Free memory for transactions
  freeTransactions(outtransactions);

  //Incoming Transactions
  const intransactions = getInTransactions();

  // Decode the GeniusArray collection
  const ingeniusArrays = koffi.decode(
    intransactions.ptr,
    GeniusArray,
    intransactions.size
  );

  // Loop through each GeniusArray entry
  for (let i = 0; i < intransactions.size; i++) {
    const entry = ingeniusArrays[i]; // Get each GeniusArray entry
    const dataBuffer = koffi.decode(entry.ptr, "uint8_t", entry.size); // Decode the raw data

    // Check if dataBuffer already exists in transactionList
    const exists = transactionInList.some(
      (existingBuffer) =>
        existingBuffer.length === dataBuffer.length &&
        existingBuffer.every((value, index) => value === dataBuffer[index])
    );

    if (!exists) {
      transactionInList.push(dataBuffer);
      ParseTransaction(dataBuffer);
    }
  }
  console.log("Readable Transactions:", transactionInList);

  // Free memory for transactions
  freeTransactions(intransactions);

}

// function CheckBlocks() {
//   const transactions = getBlocks();

//   // Decode the GeniusArray collection
//   const geniusArrays = koffi.decode(
//     transactions.ptr,
//     GeniusArray,
//     transactions.size
//   );

//   // Loop through each GeniusArray entry
//   for (let i = 0; i < transactions.size; i++) {
//     const entry = geniusArrays[i]; // Get each GeniusArray entry
//     const dataBuffer = koffi.decode(entry.ptr, "uint8_t", entry.size); // Decode the raw data

//     // Check if dataBuffer already exists in transactionList
//     const exists = transactionList.some(
//       (existingBuffer) =>
//         existingBuffer.length === dataBuffer.length &&
//         existingBuffer.every((value, index) => value === dataBuffer[index])
//     );

//     if (!exists) {
//       blockList.push(dataBuffer);
//       ParseBlock(dataBuffer);
//     }
//   }
//   console.log("Readable Blocks:", blockList);

//   // Free memory for transactions
//   freeTransactions(transactions);
// }

function ParseTransaction(transactionData: Uint8Array) {
  //Try Decoding as Mint
  try {
    const mint = MintTx.fromBinary(transactionData);
    console.log("Mint Message: " + mint.amount);
    mintMsg(mint);
    return;
  } catch (e) {
    console.log("Cannot Decode as mint" + e);
  }
  //Try decoding as processing
  try {
    const processing = ProcessingTx.fromBinary(transactionData);
    processingMsg(processing);
    return;
  } catch (e) {
    console.log("Cannot Decode as processing" + e);
  }
  //Try decoding as Escrow
  try {
    const escrow = EscrowTx.fromBinary(transactionData);
    escrowMsg(escrow);
    return;
  } catch (e) {
    console.log("Cannot Decode as escrow" + e);
  }
  //Try decoding as transfer
  try {
    const transfer = TransferTx.fromBinary(transactionData);
    transferMsg(transfer);
    return;
  } catch (e) {
    console.log("Cannot Decode as transfer" + e);
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

// function ParseBlock(transactionData: Uint8Array) {
//   //Try Decoding as Block Header
//   try {
//     const block = BlockHeaderData.fromBinary(transactionData);
//     console.log(" Block Message ");
//     console.log("Parent Hash: " + block.parentHash);
//     console.log("Block Number: " + block.blockNumber);
//     console.log("stateRoot: " + block.stateRoot);
//     console.log("Extrin Root: " + block.extrinsicsRoot);
//     console.log("digest: " + block.digest);
//     blockMsg(block);
//     return;
//   } catch (e) {
//     console.log("Cannot Decode as block tx" + e);
//   }
// }

function runGeniusSDKProcess(jsonData) {
  try {
    // Ensure parameters are valid
    if (typeof jsonData !== "string") {
      throw new Error("Invalid arguments: jsonData must be a string");
    }

    // Call the GeniusSDKProcess C function
    GeniusSDKProcess(jsonData); // Convert amount to BigInt if needed for C compatibility

    console.log(`Processed successfully: JSON Data=${jsonData}`);
  } catch (error) {
    console.error(`Error running GeniusSDKProcess: ${error.message}`);
  }
}

function getGeniusSDKCost(jsonData: string): bigint | null {
  try {
    // Ensure parameters are valid
    if (typeof jsonData !== "string") {
      throw new Error("Invalid arguments: jsonData must be a string");
    }

    // Call the GeniusSDKGetCost C function and capture the result
    const cost = GeniusSDKGetCost(jsonData);

    // Convert the result to BigInt if it's not already one (Koffi should handle this)
    const costBigInt = BigInt(cost);

    console.log(
      `Processed successfully: JSON Data=${jsonData}, Cost=${costBigInt}`
    );
    return costBigInt;
  } catch (error) {
    console.error(`Error running GeniusSDKGetCost: ${error.message}`);
    return null; // Return null in case of error
  }
}

export {
  createNode,
  getGeniusSDKCost,
  runGeniusSDKProcess,
  //CheckBlocks,
  CheckTransactions,
};
