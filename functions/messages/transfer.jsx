import transactionInfo from "data/prepared/transactionInfo";

const transferMsg = (transfer) => {
	let transaction = {
		txHash: String.fromCharCode(...transfer.dagStruct.dataHash), //previous hash until we have actual hash
		type: "Transfer",
		value: transfer.amount,
		time: transfer.dagStruct.timestamp,
	};

	//transactionInfo = [transaction, ...transactionInfo].slice(0, 200);
	transactionInfo.unshift(transaction);

	// Limit the size of the array to 200
	if (transactionInfo.length > 200) {
		transactionInfo.pop();
	}
};

export default transferMsg;
