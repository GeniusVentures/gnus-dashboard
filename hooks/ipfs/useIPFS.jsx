import { useEffect, useState } from "react";
import axios from "axios";
import { blockchainData } from "data/prepared/blockchainInfo";
import { transactionData } from "data/prepared/transactionInfo";

const useIPFS = () => {
	console.log(blockchainData, transactionData);
	const [blockchainInfo, setBlockchainInfo] = useState([]);
	const [transactionInfo, setTransactionInfo] = useState([]);

	useEffect(() => {
		startNode();
		setTimeout(() => {
			setInterval(() => {
				// getTransactionData();
				// getBlockchainData();
			}, 2000);
		}, 3000);
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
		setBlockchainInfo(blockchainData);
	};

	const getTransactionData = () => {
		setTransactionInfo(transactionData);
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
