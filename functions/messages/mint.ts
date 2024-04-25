import { updateTD, transactionData } from "data/prepared/transactionInfo";

let keys: string[] = [];

const mintMsg = (mint: any, key: string) => {
	try {
		if (!keys.includes(key)) {
			let transaction = {
				txHash: String.fromCharCode(...mint.dagStruct.dataHash),
				type: "Mint",
				value: mint.amount.toString(),
				time: mint.dagStruct.timestamp.toString(),
			};

			updateTD([transaction, ...transactionData].slice(0, 200));
			keys.push(key);
		}
	} catch (err) {
		console.log(err);
	}
};

export default mintMsg;
