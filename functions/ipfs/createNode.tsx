import koffi from 'koffi';
import path from 'path';
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
const GeniusSDKProcess = GeniusSDK.func('void GeniusSDKProcess(const char*, unsigned long long)');
const GeniusSDKGetBalance = GeniusSDK.func('uint64_t GeniusSDKGetBalance()');
const GeniusSDKGetTransactions = GeniusSDK.func('GeniusMatrix GeniusSDKGetTransactions()');
const GeniusSDKFreeTransactions = GeniusSDK.func('void GeniusSDKFreeTransactions(GeniusMatrix)');
const GeniusSDKMintTokens = GeniusSDK.func('void GeniusSDKMintTokens(uint64_t)');
const GeniusSDKGetAddress = GeniusSDK.func('GeniusAddress GeniusSDKGetAddress()');
const GeniusSDKTransferTokens = GeniusSDK.func('bool GeniusSDKTransferTokens(uint64_t, GeniusAddress*)');

export const initGnus = GeniusSDKInit;
export const processGnus = GeniusSDKProcess;
export const getBalance = GeniusSDKGetBalance;
export const getTransactions = GeniusSDKGetTransactions;
export const freeTransactions = GeniusSDKFreeTransactions;
export const mintTokens = GeniusSDKMintTokens;
export const getAddress = GeniusSDKGetAddress;
export const transferTokens = GeniusSDKTransferTokens;

let node = null;

let requestout = 0;
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
	
		// You can now set up your node object or perform other actions
		node = { initialized: true, details: result };
	  } catch (e) {
		console.error('Error initializing GeniusSDK:', e);
	  }

	  console.log('Balance:', getBalance());
		const transactions = getTransactions();
		console.log('Transactions:', transactions);
		// Free memory for transactions
		freeTransactions(transactions);
		mintTokens(1000);
		console.log('Address:', getAddress());
};

export default createNode;
