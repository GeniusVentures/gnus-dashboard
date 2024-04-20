import transactionInfo from "data/prepared/transactionInfo";

const processingMsg = (processing) => {
	let transaction = {
		txHash: processing.dagStruct.previousHash, //previous hash until we have actual hash
		type: "Processing",
		value: null, //need tx value
		time: processing.dagStruct.timestamp,
	};

	transactionInfo = [transaction, ...transactionInfo].slice(0, 200);
};

export default processingMsg;
