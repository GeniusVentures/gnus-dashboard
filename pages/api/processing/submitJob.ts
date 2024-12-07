import { NextApiRequest, NextApiResponse } from "next";
import { runGeniusSDKProcess } from "functions/ipfs/node";

const getEstimate = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  try {
    const jsonRequest = req.body.jsonRequest;
    const response: any = await runGeniusSDKProcess(jsonRequest);
    console.log("processing response" + parseInt(response));
    res.status(200).json(parseInt(response));
  } catch (err) {
    res.status(500).json({ error: "failed to process job." });
  }
};
export default getEstimate;
