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

const GeniusSDKInit = GeniusSDK.func('const char* GeniusSDKInit(const char*, const char*)');
const GeniusSDKProcess = GeniusSDK.func('void GeniusSDKProcess(const char*, unsigned long long)');

export const initGnus = GeniusSDKInit;
export const processGnus = GeniusSDKProcess;

let node = null;

let requestout = 0;
const createNode = async () => {
	try {
		// Set up the required base path and Ethereum private key
		const basePath = path.join(process.cwd(), 'data') + "/"; // Adjust the path as needed
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
};

export default createNode;
