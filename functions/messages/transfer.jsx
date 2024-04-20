import { updateTD, transactionData } from "data/prepared/transactionInfo";

let keys = [];

const transferMsg = (transfer, key) => {
	if (!keys.includes(key)) {
		let transaction = {
			txHash: transfer.dagStruct.previousHash.toString(), //previous hash until we have actual hash
			type: "Transfer",
			value: transfer.amount.toString(),
			time: transfer.dagStruct.timestamp.toString(),
		};

		updateTD([transaction, ...transactionData].slice(0, 200));
		keys.push(key);
	}
};

export default transferMsg;
