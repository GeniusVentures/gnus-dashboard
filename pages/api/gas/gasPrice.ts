import axios from "axios";
import { formatUnits } from "ethers";
const gasPrice = async (req, res) => {
  await axios
    .post(
      "https://eth-mainnet.blastapi.io/bb92548d-1cc2-4d2a-b477-cb1473694cbd",
      { jsonrpc: "2.0", id: 0, method: "eth_gasPrice" }
    )
    .then((data) => {
      const wei = parseInt(formatUnits(data.data.result, "wei"));
      res.status(200).json(wei / 10 ** 9);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json("Error fetching gas price.");
    });
};
export default gasPrice;
