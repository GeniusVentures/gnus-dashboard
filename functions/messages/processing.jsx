import { updateTD, transactionData } from "data/prepared/transactionInfo";

const processingMsg = (processing) => {
	try {
		let transaction = {
			txHash: String.fromCharCode(...processing.dagStruct.dataHash), //previous hash until we have actual hash
			type: "Processing",
			value: null, //need tx value
			time: processing.dagStruct.timestamp,
		};

		updateTD([transaction, ...transactionData].slice(0, 200));
	} catch (err) {
		console.log(err);
	}
};

export default processingMsg;
