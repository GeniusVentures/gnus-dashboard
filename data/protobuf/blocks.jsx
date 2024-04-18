// const blocks = [
//   {
//     block: "251",
//     proposer: "GNUS.AI",
//     txs: "3",
//     time: new Date(),
//   },
//   {
//     block: "252",
//     proposer: "GNUS.AI",
//     txs: "8",
//     time: new Date(),
//   },
//   {
//     block: "253",
//     proposer: "GNUS.AI",
//     txs: "6",
//     time: new Date(),
//   },
//   {
//     block: "254",
//     proposer: "GNUS.AI",
//     txs: "12",
//     time: new Date(),
//   },
//   {
//     block: "255",
//     proposer: "GNUS.AI",
//     txs: "3",
//     time: new Date(),
//   },
//   {
//     block: "256",
//     proposer: "GNUS.AI",
//     txs: "9",
//     time: new Date(),
//   },
//   {
//     block: "257",
//     proposer: "GNUS.AI",
//     txs: "6",
//     time: new Date(),
//   },
// ];

const blocks = () => {
  let blockData = [];
  let block = 3699;

  for (let i = 0; i < 10; i++) {
    const txs = `${(Math.random() * 10).toFixed(0)}`;
    const time = new Date().toISOString();

    // Add a new test data entry to the array
    blockData.push({
      block,
      proposer: "GNUS.AI",
      txs,
      time,
    });
    block++;
  }
  return blockData.reverse();
};

export default blocks;
