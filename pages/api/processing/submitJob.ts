import { NextApiRequest, NextApiResponse } from "next";
import { runGeniusSDKProcess } from "functions/ipfs/node";
import { withAuth } from "middleware/auth";
import { validateRequest, schemas, sanitizeInput } from "middleware/validation";
import { strictRateLimit } from "middleware/rateLimit";

const submitJobHandler = async (
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

    const response: any = await runGeniusSDKProcess(jsonRequest);
    
    // Log successful processing without sensitive data
    console.info('Job processing completed successfully');
    
    res.status(200).json({ 
      result: parseInt(response),
      message: 'Job submitted successfully'
    });
  } catch (error) {
    // Log error without exposing details
    console.error('Job processing failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: "Failed to process job" });
  }
};

// Apply middleware chain
const handler = (req: NextApiRequest, res: NextApiResponse) => {
  return new Promise((resolve, reject) => {
    strictRateLimit(req, res, () => {
      validateRequest(schemas.jobSubmission)(req, res, () => {
        resolve(withAuth(submitJobHandler, 'user')(req, res));
      });
    });
  });
};

export default handler;
