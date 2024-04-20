import { useEffect, useState } from "react";
import axios from "axios";

const useIPFS = () => {
	const [blockchainInfo, setBlockchainInfo] = useState([]);
	const [transactionInfo, setTransactionInfo] = useState([]);

	useEffect(() => {
		startNode();
	}, []);

	const startNode = () => {
		axios.get("/api/libp2p/startLibp2p");
		// .then((response) => {
		// 	setBlockchainInfo(response.data.blockchainInfo);
		// 	setTransactionInfo(response.data.transactionInfo);
		// })
		// .catch((error) => {
		// console.error(error);
		// setTimeout(() => {
		// 	startNode();
		// }, 1000);
		// });
	};

	const getBlockchainData = () => {
		axios
			.get("/api/networkData/getBlocksPrev")
			.then((blockchainData) => {
				setBlockchainInfo(blockchainData);
			})
			.catch((error) => {
				console.error(error);
			});
	};

	const getTransactionData = () => {
		axios
			.get("/api/networkData/getTransPrev")
			.then((transactionData) => {
				setTransactionInfo(transactionData);
			})
			.catch((error) => {
				console.error(error);
			});
	};

	const blockSearch = () => {};

	const transSearch = () => {};

	const walletSearch = () => {};

	return {
		blockchainInfo,
		transactionInfo,
		blockSearch,
		transSearch,
		walletSearch,
	};
};

export default useIPFS;
