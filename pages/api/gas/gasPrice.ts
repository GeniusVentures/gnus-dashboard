import axios from "axios";
import { formatUnits } from "ethers";
import { NextApiRequest, NextApiResponse } from "next";

const gasPrice = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  // Validate API key exists
  const apiKey = process.env.BLASTAPI_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "API configuration error" });
    return;
  }

  try {
    const response = await axios.post(
      `https://eth-mainnet.blastapi.io/${apiKey}`,
      { jsonrpc: "2.0", id: 0, method: "eth_gasPrice" },
      { timeout: 5000 }
    );
    
    const wei = parseInt(formatUnits(response.data.result, "wei"));
    res.status(200).json(wei / 10 ** 9);
  } catch (error) {
    // Log error without exposing details
    console.error("Gas price fetch failed:", (error as Error).message);
    res.status(500).json({ error: "Failed to fetch gas price" });
  }
};

export default gasPrice;