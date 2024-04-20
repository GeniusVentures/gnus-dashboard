import { transactionData } from "data/prepared/transactionInfo";

const getTransPrev = (req, res) => {
	console.log(transactionData);
	res.status(200).json(transactionData);
};

export default getTransPrev;
