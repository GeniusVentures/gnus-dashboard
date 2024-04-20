import blockchainInfo from "data/prepared/blockchainInfo";

const blockMsg = (block) => {
	//I haven't done anything with there being an if else statement with the blocks yet
	const newBlock = {
		block: block.header.blockNumber,
		hash: block.hash,
		transactions: null, // need number of transactions in the block
		time: block.header.timestamp,
	};

	blockchainInfo = [newBlock, ...blockchainInfo].slice(0, 200);
};

export default blockMsg;
