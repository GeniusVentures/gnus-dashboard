import transactionInfo from "data/prepared/transactionInfo";

const mintMsg = (mint) => {
	let transaction = {
		txHash: mint.dagStruct.previousHash, //previous hash until we have actual hash
		type: "Mint",
		value: mint.amount,
		time: mint.dagStruct.timestamp,
	};

	transactionInfo = [transaction, ...transactionInfo].slice(0, 200);
};

export default mintMsg;
