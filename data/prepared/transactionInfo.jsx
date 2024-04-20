let transactionData = [];

const transactionInfo = () => {
	try {
		const updateTD = (data) => {
			transactionData = data;
		};
		return { transactionData, updateTD };
	} catch (err) {
		console.log(err);
	}
};

export default transactionInfo;
