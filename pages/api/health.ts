import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic health checks
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };

  // Check environment variables
  const requiredEnvVars = [
    'BLASTAPI_KEY',
    'WALLETCONNECT_PROJECT_ID',
    'ETH_PRIVATE_KEY',
    'JWT_SECRET'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    return res.status(503).json({
      ...health,
      status: 'unhealthy',
      error: 'Missing required environment variables',
      missing: missingEnvVars
    });
  }

  res.status(200).json(health);
}