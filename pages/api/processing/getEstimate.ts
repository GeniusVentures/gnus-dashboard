import axios from "axios";
import { formatUnits } from "ethers";
import { NextApiRequest, NextApiResponse } from "next";
import { getGeniusSDKCost } from "functions/ipfs/node";

const getEstimate = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const jsonRequest = req.body.jsonRequest;
  console.log(jsonRequest);
  const estimate = await getGeniusSDKCost(jsonRequest);
  console.log(estimate);
};
export default getEstimate;
