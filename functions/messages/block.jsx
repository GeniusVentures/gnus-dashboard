import { updateBCD } from "data/prepared/blockchainInfo";

const blockMsg = (block) => {
	//I haven't done anything with there being an if else statement with the blocks yet
	const newBlock = {
		block: block.header.blockNumber,
		hash: block.hash,
		transactions: 1, // Currently transaction count is always 1.
		time: block.header.timestamp,
	};

	updateBCD([newBlock, ...blockchainInfo].slice(0, 200));
};

export default blockMsg;
