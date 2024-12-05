import { createNode } from "functions/ipfs/node";

const startLibp2p = async (req, res) => {
  const data = await createNode().catch((err) => {
    console.log(err);
    res.status(500).json({ error: err.message });
  });
  res.status(200).json(data);
};

export default startLibp2p;
