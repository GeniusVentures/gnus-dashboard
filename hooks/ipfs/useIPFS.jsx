import { useEffect, useState } from "react";
import axios from "axios";
import blockchainInfo from "data/prepared/blockchainInfo";
import transactionInfo from "data/prepared/transactionInfo";

const useIPFS = () => {
	const [blockchainData, setBlockchainData] = useState([]);
	const [transactionData, setTransactionData] = useState([]);

	useEffect(() => {
		startNode();
		setTimeout(() => {
			setInterval(() => {
				getTransactionData();
				getBlockchainData();
			}, 2000);
		}, 3000);
	}, []);

	const startNode = () => {
		axios
			.get("/api/libp2p/startLibp2p")
			.then((response) => {
				setBlockchainData(response.data.blockchainInfo);
				setTransactionData(response.data.transactionInfo);
			})
			.catch((error) => {
				console.error(error);
				setTimeout(() => {
					startNode();
				}, 1000);
			});
	};

	const getBlockchainData = () => {
		setBlockchainData(blockchainInfo);
	};

	const getTransactionData = () => {
		setTransactionData(transactionInfo);
	};

	const blockSearch = () => {};

	const transSearch = () => {};

	const walletSearch = () => {};

	return {
		blockchainData,
		transactionData,
		blockSearch,
		transSearch,
		walletSearch,
	};
};

export default useIPFS;
