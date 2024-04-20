import { updateBCD, blockchainData } from "data/prepared/blockchainInfo";

const blockMsg = (block) => {
	try {
		// Get current time in milliseconds
		const currentTimeMillis = Date.now();
		// Get the last three digits from performance.now() for microsecond precision
		const microsecondPart = performance.now().toFixed(3).split(".")[1];
		// Combine milliseconds and microseconds
		const timestamp = `${currentTimeMillis}${microsecondPart}`;

		const newBlock = {
			block: 1,
			hash: block.hash,
			transactions: 1, // Currently transaction count is always 1.
			time: timestamp,
		};

		updateBCD([newBlock, ...blockchainData].slice(0, 200));
	} catch (err) {
		console.log(err);
	}
};

export default blockMsg;
