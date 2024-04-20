import { transactionData } from "data/prepared/transactionInfo";

const getTransPrev = (req, res) => {
	res.status(200).json(transactionData);
};

export default getTransPrev;
