import { blockchainData } from "data/prepared/blockchainInfo";

const getTransPrev = (req, res) => {
	console.log(blockchainData);
	res.status(200).json(blockchainData);
};

export default getTransPrev;
