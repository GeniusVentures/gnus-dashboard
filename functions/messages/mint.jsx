import { updateTD, transactionData } from "data/prepared/transactionInfo";

const mintMsg = (mint) => {
	try {
		let transaction = {
			txHash: String.fromCharCode(...mint.dagStruct.dataHash),
			type: "Mint",
			value: mint.amount.toString(),
			time: mint.dagStruct.timestamp.toString(),
		};

		updateTD([transaction, ...transactionData].slice(0, 200));
	} catch (err) {
		console.log(err);
	}
};

export default mintMsg;
