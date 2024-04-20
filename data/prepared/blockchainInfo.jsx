let blockchainData = [];

const blockchainInfo = () => {
	const updateBCD = (data) => {
		blockchainData = data;
	};

	return { updateBCD, blockchainData };
};

export default blockchainInfo;
