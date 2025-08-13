import { createMocks } from 'node-mocks-http';
import getEstimateHandler from '../../../../pages/api/processing/getEstimate';

// Mock the IPFS node functions
jest.mock('../../../../functions/ipfs/node', () => ({
  getGeniusSDKCost: jest.fn()
}));

import { getGeniusSDKCost } from '../../../../functions/ipfs/node';

describe('/api/processing/getEstimate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cost estimate successfully', async () => {
    const mockEstimate = 1500;
    getGeniusSDKCost.mockResolvedValueOnce(mockEstimate);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        jsonRequest: {
          type: 'processing',
          data: 'test data'
        }
      }
    });

    await getEstimateHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toBe(mockEstimate);
    expect(getGeniusSDKCost).toHaveBeenCalledWith({
      type: 'processing',
      data: 'test data'
    });
  });

  it('handles missing jsonRequest in body', async () => {
    // When jsonRequest is undefined, SDK might throw or return undefined
    // Let's make it throw to trigger the catch block
    getGeniusSDKCost.mockRejectedValueOnce(new Error('Invalid request'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {}
    });

    await getEstimateHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to get estimate.'
    });
  });

  it('handles SDK errors gracefully', async () => {
    getGeniusSDKCost.mockRejectedValueOnce(new Error('SDK error'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        jsonRequest: {
          type: 'processing',
          data: 'test data'
        }
      }
    });

    await getEstimateHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to get estimate.'
    });
  });

  it('handles non-numeric estimate response', async () => {
    getGeniusSDKCost.mockResolvedValueOnce('invalid');

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        jsonRequest: {
          type: 'processing',
          data: 'test data'
        }
      }
    });

    await getEstimateHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    // parseInt('invalid') returns NaN, but JSON.parse(NaN) throws error
    // So we need to check the raw response
    const responseData = res._getData();
    expect(responseData).toBe('null'); // JSON.stringify(NaN) returns 'null'
  });
});
