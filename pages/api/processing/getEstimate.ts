import { NextApiRequest, NextApiResponse } from "next";
import { getGeniusSDKCost } from "functions/ipfs/node";

const getEstimate = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  try {
    const jsonRequest = req.body.jsonRequest;
    const estimate: any = await getGeniusSDKCost(jsonRequest);
    console.log("cost estimate" + parseInt(estimate));
    res.status(200).json(parseInt(estimate));
  } catch (err) {
    res.status(500).json({ error: "Failed to get estimate." });
  }
};
export default getEstimate;
