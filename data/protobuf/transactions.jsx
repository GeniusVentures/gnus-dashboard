// const transactions = [
//   {
//     txHash:
//       "0x4a3bca8d1e5bce1e01e6c2c961e6a1c286589cf0baf8c2c2b509f916a2e63a5f",
//     type: "Transfer",
//     value: "0.125 GNUS",
//     time: "2024-03-08T18:31:29.771Z",
//     height: "357443",
//   },
//   {
//     txHash:
//       "0x7d9a4ebf0447e0a4908f16ff9c6b7b1f7009838f8d7b74dc81a9c1f9d6b073a2",
//     type: "Processing",
//     value: "0.734 GNUS",
//     time: "2024-03-08T18:31:29.771Z",
//     height: "618198",
//   },
//   {
//     txHash:
//       "0x8257fcf9d09fcafd97c884e9298e4cb75817a7229d0b0a2d7c78cbdc93764f5a",
//     type: "Test TX",
//     value: "0.256 GNUS",
//     time: "2024-03-08T18:31:29.771Z",
//     height: "1674651",
//   },
//   {
//     txHash:
//       "0x96b0b5ad745d71d1868b29dcd32d269dbf9f9d1d86a012ba0847a2ac95b080b8",
//     type: "Minting",
//     value: "2.567 GNUS",
//     time: "2024-03-08T18:31:29.771Z",
//     height: "1616169",
//   },
// ];

const transactions = () => {
  let txData = [];
  let height = 16169;

  for (let i = 0; i < 10; i++) {
    const typeDistribution = [
      "Transfer",
      "Processing",
      "Transfer",
      "Transfer",
      "Processing",
    ];
    const type = typeDistribution[i % typeDistribution.length];
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const value = `${(Math.random() * 10).toFixed(3)} GNUS`;
    const time = new Date().toISOString();

    // Add a new test data entry to the array
    console.log(type);
    txData.push({
      txHash,
      type,
      value,
      time,
      height: String(height),
    });
  }
  return txData;
};

export default transactions;
