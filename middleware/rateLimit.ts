import { NextApiRequest, NextApiResponse } from "next";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export const rateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) => {
  const { windowMs, maxRequests, message = 'Too many requests' } = options;

  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    // Handle test environment where connection might not exist
    const forwardedFor = req.headers['x-forwarded-for'];
    const remoteAddress = req.socket?.remoteAddress || req.connection?.remoteAddress;
    const clientId = forwardedFor || remoteAddress || 'unknown';
    const key = `${clientId}:${req.url}`;
    const now = Date.now();

    // Clean up expired entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });

    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else if (store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      store[key].count++;
    }

    const remaining = Math.max(0, maxRequests - store[key].count);
    const resetTime = Math.ceil((store[key].resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (store[key].count > maxRequests) {
      return res.status(429).json({
        error: message,
        retryAfter: resetTime
      });
    }

    next();
  };
};

export const defaultRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});

export const strictRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  maxRequests: 10,
  message: 'Too many requests to sensitive endpoint'
});