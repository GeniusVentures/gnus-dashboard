import { createMocks } from 'node-mocks-http';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.BLASTAPI_KEY = 'test-api-key';

// Mock all middleware modules
jest.mock('middleware/auth', () => ({
  withAuth: (handler) => handler, // Bypass auth wrapper
}));

jest.mock('middleware/validation', () => ({
  validateRequest: () => (req, res, next) => next(),
  schemas: { jobSubmission: {} },
  sanitizeInput: (input) => input
}));

jest.mock('middleware/rateLimit', () => ({
  defaultRateLimit: (req, res, next) => {
    res.setHeader('X-RateLimit-Limit', 100);
    res.setHeader('X-RateLimit-Remaining', 99);
    next();
  }
}));

// Mock the IPFS node functions
jest.mock('functions/ipfs/node', () => ({
  getGeniusSDKCost: jest.fn()
}));

import getEstimateHandler from '../../../../pages/api/processing/getEstimate';
import { getGeniusSDKCost } from 'functions/ipfs/node';

describe('/api/processing/getEstimate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cost estimate successfully', async () => {
    const mockEstimate = 5000;
    getGeniusSDKCost.mockResolvedValueOnce(mockEstimate);

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        jsonRequest: JSON.stringify({
          type: 'estimation',
          data: 'processing data',
          parameters: {
            model: 'test-model',
            complexity: 'medium'
          }
        }),
        type: 'estimation'
      }
    });

    req.socket = { remoteAddress: '127.0.0.1' };

    await getEstimateHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.estimate).toBe(mockEstimate);
    expect(responseData.currency).toBe('GNUS');
  });

  it('handles missing jsonRequest in body', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        type: 'estimation'
      }
    });

    req.socket = { remoteAddress: '127.0.0.1' };

    await getEstimateHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Invalid JSON format in request');
  });

  it('validates JSON format', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        jsonRequest: 'invalid-json',
        type: 'estimation'
      }
    });

    req.socket = { remoteAddress: '127.0.0.1' };

    await getEstimateHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Invalid JSON format in request');
  });

  it('handles SDK errors gracefully', async () => {
    getGeniusSDKCost.mockRejectedValueOnce(new Error('Cost calculation failed'));

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        jsonRequest: JSON.stringify({ type: 'estimation' }),
        type: 'estimation'
      }
    });

    req.socket = { remoteAddress: '127.0.0.1' };

    await getEstimateHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to get estimate'
    });
  });

  it('rejects non-POST methods', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        'authorization': 'Bearer mock-token'
      }
    });

    req.socket = { remoteAddress: '127.0.0.1' };

    await getEstimateHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    });
  });
});