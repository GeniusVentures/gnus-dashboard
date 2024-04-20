import transactionInfo from "data/prepared/transactionInfo";

const processingMsg = (processing) => {
	let transaction = {
		txHash: String.fromCharCode(...processing.dagStruct.dataHash), //previous hash until we have actual hash
		type: "Processing",
		value: null, //need tx value
		time: processing.dagStruct.timestamp,
	};

	//transactionInfo = [transaction, ...transactionInfo].slice(0, 200);
	transactionInfo.unshift(transaction);

	// Limit the size of the array to 200
	if (transactionInfo.length > 200) {
		transactionInfo.pop();
	}
};

export default processingMsg;
