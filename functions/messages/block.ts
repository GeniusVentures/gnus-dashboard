import { updateBCD, blockchainData } from "data/prepared/blockchainInfo";

let keys: string[] = [];

const blockMsg = (block: any) => {
	//if (key.split("/")[3] === "0") return;
	try {
		const currentTimeMillis = Date.now();
		const microsecondPart = performance.now().toFixed(4).split(".")[1];
		const timestamp = `${currentTimeMillis}${microsecondPart}`;

		const newBlock = {
			//block: block.blockNumber,
			block: 0,
			hash: String.fromCharCode(...block.parentHash),
			transactions: 1, // Currently transaction count is always 1.
			time: timestamp,
		};

		updateBCD(
			[newBlock, ...blockchainData]
				.sort((a, b) => b.block - a.block)
				.slice(0, 200),
		);
		//keys.push(key);
		
	} catch (err) {
		console.log(err);
	}
};

export default blockMsg;
