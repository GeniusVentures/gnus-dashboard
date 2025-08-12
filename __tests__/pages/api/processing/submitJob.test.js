import { createMocks } from 'node-mocks-http';
import submitJobHandler from '../../../../pages/api/processing/submitJob';

// Mock the IPFS node functions
jest.mock('../../../../functions/ipfs/node', () => ({
  runGeniusSDKProcess: jest.fn()
}));

import { runGeniusSDKProcess } from '../../../../functions/ipfs/node';

describe('/api/processing/submitJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits job successfully', async () => {
    const mockResponse = 12345;
    runGeniusSDKProcess.mockResolvedValueOnce(mockResponse);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        jsonRequest: {
          type: 'job',
          data: 'processing data',
          parameters: {
            model: 'test-model',
            input: 'test input'
          }
        }
      }
    });

    await submitJobHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toBe(mockResponse);
    expect(runGeniusSDKProcess).toHaveBeenCalledWith({
      type: 'job',
      data: 'processing data',
      parameters: {
        model: 'test-model',
        input: 'test input'
      }
    });
  });

  it('handles missing jsonRequest in body', async () => {
    // When jsonRequest is undefined, SDK should throw error
    runGeniusSDKProcess.mockRejectedValueOnce(new Error('Invalid request'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {}
    });

    await submitJobHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'failed to process job.'
    });
  });

  it('handles SDK processing errors', async () => {
    runGeniusSDKProcess.mockRejectedValueOnce(new Error('Processing failed'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        jsonRequest: {
          type: 'job',
          data: 'processing data'
        }
      }
    });

    await submitJobHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'failed to process job.'
    });
  });

  it('handles empty job request', async () => {
    // Empty object is valid, SDK will process it and return a value
    runGeniusSDKProcess.mockResolvedValueOnce('42');

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        jsonRequest: {}
      }
    });

    await submitJobHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toBe(42);
  });

  it('handles malformed JSON request', async () => {
    // null is passed to SDK, which should throw error
    runGeniusSDKProcess.mockRejectedValueOnce(new Error('Invalid JSON'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        jsonRequest: null
      }
    });

    await submitJobHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'failed to process job.'
    });
  });
});
