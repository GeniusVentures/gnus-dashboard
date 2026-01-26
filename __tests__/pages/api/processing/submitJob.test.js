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
  strictRateLimit: (req, res, next) => {
    res.setHeader('X-RateLimit-Limit', 100);
    res.setHeader('X-RateLimit-Remaining', 99);
    next();
  }
}));

// Mock the IPFS node functions
jest.mock('functions/ipfs/node', () => ({
  runGeniusSDKProcess: jest.fn()
}));

import submitJobHandler from '../../../../pages/api/processing/submitJob';
import { runGeniusSDKProcess } from 'functions/ipfs/node';

describe('/api/processing/submitJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits job successfully', async () => {
    const mockResponse = 12345;
    runGeniusSDKProcess.mockResolvedValueOnce(mockResponse);

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        jsonRequest: JSON.stringify({
          type: 'job',
          data: 'processing data',
          parameters: {
            model: 'test-model',
            input: 'test input'
          }
        }),
        type: 'processing',
        priority: 3
      }
    });

    req.socket = { remoteAddress: '127.0.0.1' };

    await submitJobHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.result).toBe(mockResponse);
    expect(responseData.message).toBe('Job submitted successfully');
  });

  it('handles missing jsonRequest in body', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        type: 'processing'
      }
    });

    req.socket = { remoteAddress: '127.0.0.1' };

    await submitJobHandler(req, res);

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
        type: 'processing'
      }
    });

    req.socket = { remoteAddress: '127.0.0.1' };

    await submitJobHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Invalid JSON format in request');
  });

  it('handles SDK processing errors', async () => {
    runGeniusSDKProcess.mockRejectedValueOnce(new Error('Processing failed'));

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json'
      },
      body: {
        jsonRequest: JSON.stringify({ type: 'job' }),
        type: 'processing'
      }
    });

    req.socket = { remoteAddress: '127.0.0.1' };

    await submitJobHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to process job'
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

    await submitJobHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    });
  });
});