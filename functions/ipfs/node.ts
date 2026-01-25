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

// Define additional structs that match the C header
const GeniusTokenValue = koffi.struct("GeniusTokenValue", {
  value: koffi.array("char", 22)
});

const GeniusTokenID = koffi.struct("GeniusTokenID", {
  data: koffi.array("unsigned char", 32)
});

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

// Init functions
const GeniusSDKInit = GeniusSDK.func(
  "const char* GeniusSDKInit(const char*, const char*, bool, bool, uint16_t, bool)"
);
const GeniusSDKInitSecure = GeniusSDK.func(
  "const char* GeniusSDKInitSecure(const char*, const char*, const char*, bool, bool, uint16_t, bool)"
);
const GeniusSDKInitMinimal = GeniusSDK.func(
  "const char* GeniusSDKInitMinimal(const char*, const char*, uint16_t)"
);
const GeniusSDKShutdown = GeniusSDK.func("void GeniusSDKShutdown()");

// Balance functions
const GeniusSDKGetBalance = GeniusSDK.func("uint64_t GeniusSDKGetBalance(GeniusTokenID)");
const GeniusSDKGetBalanceGNUS = GeniusSDK.func("GeniusTokenValue GeniusSDKGetBalanceGNUS()");
const GeniusSDKGetBalanceGNUSString = GeniusSDK.func("const char* GeniusSDKGetBalanceGNUSString()");
const GeniusSDKGetGNUSPrice = GeniusSDK.func("double GeniusSDKGetGNUSPrice()");

// Address and transaction functions
const GeniusSDKGetAddress = GeniusSDK.func("GeniusAddress GeniusSDKGetAddress()");
const GeniusSDKGetInTransactions = GeniusSDK.func("GeniusMatrix GeniusSDKGetInTransactions()");
const GeniusSDKGetOutTransactions = GeniusSDK.func("GeniusMatrix GeniusSDKGetOutTransactions()");
const GeniusSDKFreeTransactions = GeniusSDK.func("void GeniusSDKFreeTransactions(GeniusMatrix)");

// Mint functions
const GeniusSDKMint = GeniusSDK.func(
  "void GeniusSDKMint(uint64_t, const char*, const char*, GeniusTokenID)"
);
const GeniusSDKMintGNUS = GeniusSDK.func(
  "void GeniusSDKMintGNUS(const GeniusTokenValue*, const char*, const char*)"
);

// Transfer functions
const GeniusSDKTransfer = GeniusSDK.func(
  "bool GeniusSDKTransfer(uint64_t, GeniusAddress*, GeniusTokenID)"
);
const GeniusSDKTransferGNUS = GeniusSDK.func(
  "bool GeniusSDKTransferGNUS(const GeniusTokenValue*, GeniusAddress*)"
);

// Pay dev function
const GeniusSDKPayDev = GeniusSDK.func("bool GeniusSDKPayDev(uint64_t, GeniusTokenID)");

// Cost and processing functions
const GeniusSDKGetCost = GeniusSDK.func("uint64_t GeniusSDKGetCost(const char*)");
const GeniusSDKGetCostGNUS = GeniusSDK.func("GeniusTokenValue GeniusSDKGetCostGNUS(const char*)");
const GeniusSDKProcess = GeniusSDK.func("void GeniusSDKProcess(const char*)");

// Create convenient aliases
const initGnus = GeniusSDKInit;
const initGnusSecure = GeniusSDKInitSecure;
const initGnusMinimal = GeniusSDKInitMinimal;
const shutdownGnus = GeniusSDKShutdown;
const processGnus = GeniusSDKProcess;
const getBalance = GeniusSDKGetBalance;
const getBalanceGNUS = GeniusSDKGetBalanceGNUS;
const getBalanceGNUSString = GeniusSDKGetBalanceGNUSString;
const getGNUSPrice = GeniusSDKGetGNUSPrice;
const getOutTransactions = GeniusSDKGetOutTransactions;
const getInTransactions = GeniusSDKGetInTransactions;
const freeTransactions = GeniusSDKFreeTransactions;
const mintTokens = GeniusSDKMint;
const mintTokensGNUS = GeniusSDKMintGNUS;
const getAddress = GeniusSDKGetAddress;
const transferTokens = GeniusSDKTransfer;
const transferTokensGNUS = GeniusSDKTransferGNUS;
const payDev = GeniusSDKPayDev;
const getCost = GeniusSDKGetCost;
const getCostGNUS = GeniusSDKGetCostGNUS;

let node = null;

let requestout = 0;
let transactionOutList = [];
let transactionInList = [];
let blockList = [];

const createNode = async () => {
  try {
    // Set up the required base path and Ethereum private key
    const basePath = path.join(process.cwd(), "data") + "/";
    const ethPrivateKey = process.env.ETH_PRIVATE_KEY;

    if (!ethPrivateKey) {
      throw new Error("ETH_PRIVATE_KEY environment variable is required");
    }

    // Validate private key format (basic check)
    if (!/^[0-9a-fA-F]{64}$/.test(ethPrivateKey)) {
      throw new Error("Invalid private key format");
    }

    // Initialize GeniusSDK with updated parameters
    // Parameters: base_path, eth_private_key, autodht, process, baseport, is_full_node
    const result = GeniusSDKInit(basePath, ethPrivateKey, true, false, 40001, true);

    if (!result) {
      throw new Error("GeniusSDK initialization failed");
    }

    console.info("GeniusSDK initialized successfully");

    node = { initialized: true, details: result };
  } catch (e) {
    console.error("Error initializing GeniusSDK:", e instanceof Error ? e.message : 'Unknown error');
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
}

function runGeniusSDKProcess(jsonData: string) {
  try {
    // Validate input parameters
    if (typeof jsonData !== "string") {
      throw new Error("Invalid arguments: jsonData must be a string");
    }

    // Validate JSON format
    try {
      JSON.parse(jsonData);
    } catch {
      throw new Error("Invalid JSON format");
    }

    // Additional security: limit JSON size
    if (jsonData.length > 10000) {
      throw new Error("JSON data too large");
    }

    // Call the GeniusSDKProcess C function
    GeniusSDKProcess(jsonData);

    console.info("SDK processing completed successfully");
  } catch (error) {
    console.error("Error running GeniusSDKProcess:", error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

function getGeniusSDKCost(jsonData: string): bigint | null {
  try {
    // Validate input parameters
    if (typeof jsonData !== "string") {
      throw new Error("Invalid arguments: jsonData must be a string");
    }

    // Validate JSON format
    try {
      JSON.parse(jsonData);
    } catch {
      throw new Error("Invalid JSON format");
    }

    // Additional security: limit JSON size
    if (jsonData.length > 10000) {
      throw new Error("JSON data too large");
    }

    // Call the GeniusSDKGetCost C function and capture the result
    const cost = GeniusSDKGetCost(jsonData);

    // Convert the result to BigInt if it's not already one (Koffi should handle this)
    const costBigInt = BigInt(cost);

    console.info("SDK cost calculation completed successfully");
    return costBigInt;
  } catch (error) {
    console.error("Error running GeniusSDKGetCost:", error instanceof Error ? error.message : 'Unknown error');
    return null; // Return null in case of error
  }
}

// New function to get cost in GNUS format
function getGeniusSDKCostGNUS(jsonData: string): string | null {
  try {
    if (typeof jsonData !== "string") {
      throw new Error("Invalid arguments: jsonData must be a string");
    }

    const cost = GeniusSDKGetCostGNUS(jsonData);
    const costString = koffi.decode(cost.value, "char", 22).join('').replace(/\0.*$/, '');

    console.log(`Processed successfully: JSON Data=${jsonData}, Cost=${costString} GNUS`);
    return costString;
  } catch (error) {
    console.error(`Error running GeniusSDKGetCostGNUS: ${error.message}`);
    return null;
  }
}

// New helper functions for balance operations
function getBalanceMinions(tokenId: any): bigint | null {
  try {
    const balance = GeniusSDKGetBalance(tokenId);
    return BigInt(balance);
  } catch (error) {
    console.error(`Error getting balance: ${error.message}`);
    return null;
  }
}

function getBalanceGNUSValue(): string | null {
  try {
    const balance = GeniusSDKGetBalanceGNUS();
    return koffi.decode(balance.value, "char", 22).join('').replace(/\0.*$/, '');
  } catch (error) {
    console.error(`Error getting GNUS balance: ${error.message}`);
    return null;
  }
}

function getBalanceGNUSAsString(): string | null {
  try {
    const balance = GeniusSDKGetBalanceGNUSString();
    return balance;
  } catch (error) {
    console.error(`Error getting GNUS balance string: ${error.message}`);
    return null;
  }
}

function getCurrentGNUSPrice(): number | null {
  try {
    const price = GeniusSDKGetGNUSPrice();
    return price;
  } catch (error) {
    console.error(`Error getting GNUS price: ${error.message}`);
    return null;
  }
}

// Helper function to create GeniusTokenID
function createTokenID(data: Uint8Array): any {
  if (data.length !== 32) {
    throw new Error("Token ID must be exactly 32 bytes");
  }
  return { data: Array.from(data) };
}

// Helper function to create GeniusTokenValue
function createTokenValue(value: string): any {
  if (value.length >= 22) {
    throw new Error("Token value string too long (max 21 characters)");
  }
  const valueArray = new Array(22).fill(0);
  for (let i = 0; i < value.length; i++) {
    valueArray[i] = value.charCodeAt(i);
  }
  return { value: valueArray };
}

export {
  createNode,
  shutdownGnus,
  getGeniusSDKCost,
  getGeniusSDKCostGNUS,
  runGeniusSDKProcess,
  CheckTransactions,
  getBalanceMinions,
  getBalanceGNUSValue,
  getBalanceGNUSAsString,
  getCurrentGNUSPrice,
  mintTokens,
  mintTokensGNUS,
  transferTokens,
  transferTokensGNUS,
  payDev,
  createTokenID,
  createTokenValue,
  // Export the raw SDK functions as well for advanced usage
  GeniusSDK,
  GeniusTokenValue,
  GeniusTokenID
};