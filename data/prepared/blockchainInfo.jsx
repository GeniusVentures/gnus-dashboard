let blockchainData = [];

const blockchainInfo = () => {
	try {
		const updateBCD = (data) => {
			blockchainData = data;
		};

		return { updateBCD, blockchainData };
	} catch (err) {
		console.log(err);
	}
};

export default blockchainInfo;
