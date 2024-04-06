import createNode from "functions/ipfs/createNode";

const startLibp2p = async (req, res) => {
  createNode();
};

export default startLibp2p;
