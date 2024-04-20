import { updateBCD } from "data/prepared/blockchainInfo";

const blockMsg = (block) => {
	//I haven't done anything with there being an if else statement with the blocks yet
	const newBlock = {
		block: block.header.blockNumber,
		hash: block.hash,
		transactions: 1, // Currently transaction count is always 1.
		time: block.header.timestamp,
	};

<<<<<<< Updated upstream
	//blockchainInfo = [newBlock, ...blockchainInfo].slice(0, 200);
	blockchainInfo.unshift(newBlock);

	// Limit the size of the array to 200
	if (blockchainInfo.length > 200) {
	blockchainInfo.pop();
	}
=======
	updateBCD([newBlock, ...blockchainInfo].slice(0, 200));
>>>>>>> Stashed changes
};

export default blockMsg;
