import { NextApiRequest, NextApiResponse } from "next";
import { getGeniusSDKCost } from "functions/ipfs/node";
import { withAuth } from "middleware/auth";
import { validateRequest, schemas, sanitizeInput } from "middleware/validation";
import { defaultRateLimit } from "middleware/rateLimit";

const getEstimateHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Sanitize input
    const sanitizedBody = sanitizeInput(req.body);
    const { jsonRequest } = sanitizedBody;

    // Additional validation for JSON structure
    try {
      JSON.parse(jsonRequest);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON format in request' });
    }

    const estimate: any = await getGeniusSDKCost(jsonRequest);
    
    // Log successful estimation without sensitive data
    console.info('Cost estimation completed successfully');
    
    res.status(200).json({
      estimate: parseInt(estimate),
      currency: 'GNUS'
    });
  } catch (error) {
    // Log error without exposing details
    console.error('Cost estimation failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: "Failed to get estimate" });
  }
};

// Apply middleware chain
const handler = (req: NextApiRequest, res: NextApiResponse) => {
  return new Promise((resolve, reject) => {
    defaultRateLimit(req, res, () => {
      validateRequest(schemas.jobSubmission)(req, res, () => {
        resolve(withAuth(getEstimateHandler, 'user')(req, res));
      });
    });
  });
};

export default handler;
