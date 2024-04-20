import { updateTD, transactionData } from "data/prepared/transactionInfo";

let keys = [];

const processingMsg = (processing, key) => {
	try {
		if (!keys.includes(key)) {
			let transaction = {
				txHash: String.fromCharCode(...processing.dagStruct.dataHash), //previous hash until we have actual hash
				type: "Processing",
				value: null, //need tx value
				time: processing.dagStruct.timestamp.toString(),
			};

			updateTD([transaction, ...transactionData].slice(0, 200));
			keys.push(key);
		}
	} catch (err) {
		console.log(err);
	}
};

export default processingMsg;
