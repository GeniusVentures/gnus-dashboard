import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    address: string;
    role: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const withAuth = (handler: any, requiredRole?: string) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    return new Promise((resolve, reject) => {
      authenticateToken(req, res, () => {
        if (requiredRole) {
          requireRole(requiredRole)(req, res, () => {
            resolve(handler(req, res));
          });
        } else {
          resolve(handler(req, res));
        }
      });
    });
  };
};