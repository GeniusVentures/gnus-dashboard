import { updateTD, transactionData } from "data/prepared/transactionInfo";

const mintMsg = (mint) => {
	let transaction = {
		txHash: String.fromCharCode(...mint.dagStruct.dataHash),
		type: "Mint",
		value: mint.amount,
		time: mint.dagStruct.timestamp,
	};

<<<<<<< Updated upstream
	//transactionInfo = [transaction, ...transactionInfo].slice(0, 200);
	transactionInfo.unshift(transaction);

	// Limit the size of the array to 200
	if (transactionInfo.length > 200) {
		transactionInfo.pop();
	}
=======
	updateTD([transaction, ...transactionData].slice(0, 200));
>>>>>>> Stashed changes
};

export default mintMsg;
