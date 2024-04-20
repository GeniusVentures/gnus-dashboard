let transactionData = [];

const transactionInfo = () => {
	const updateTD = (data) => {
		transactionData = data;
	};
	return { transactionData, updateTD };
};

export default transactionInfo;
