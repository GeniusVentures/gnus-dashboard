import { updateTD, transactionData } from "data/prepared/transactionInfo";

const mintMsg = (mint) => {
	let transaction = {
		txHash: String.fromCharCode(...mint.dagStruct.dataHash),
		type: "Mint",
		value: mint.amount,
		time: mint.dagStruct.timestamp,
	};

	updateTD([transaction, ...transactionData].slice(0, 200));
};

export default mintMsg;
