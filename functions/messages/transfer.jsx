import { updateTD, transactionData } from "data/prepared/transactionInfo";

const transferMsg = (transfer) => {
	let transaction = {
		txHash: transfer.dagStruct.previousHash, //previous hash until we have actual hash
		type: "Transfer",
		value: transfer.amount,
		time: transfer.dagStruct.timestamp,
	};

	updateTD([transaction, ...transactionData].slice(0, 200));
};

export default transferMsg;
