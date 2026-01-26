import { createMocks } from 'node-mocks-http';
import gasPriceHandler from '../../../../pages/api/gas/gasPrice';
import axios from 'axios';
import { mockAuthEnv } from '../../../utils/authTestHelper';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock ethers
jest.mock('ethers', () => ({
  formatUnits: jest.fn((value, unit) => {
    if (unit === 'wei') {
      return value; // Simplified mock
    }
    return value;
  })
}));

describe('/api/gas/gasPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthEnv();
  });

  it('returns gas price successfully', async () => {
    const mockGasPrice = '0x4a817c800'; // 20 Gwei in hex
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        result: mockGasPrice
      }
    });

    const { req, res } = createMocks({
      method: 'POST'
    });

    await gasPriceHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://eth-mainnet.blastapi.io/test-api-key',
      { jsonrpc: '2.0', id: 0, method: 'eth_gasPrice' },
      { timeout: 5000 }
    );
  });

  it('handles missing API key', async () => {
    // Remove API key from environment
    delete process.env.BLASTAPI_KEY;

    const { req, res } = createMocks({
      method: 'POST'
    });

    await gasPriceHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'API configuration error'
    });
  });

  it('handles API errors gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

    const { req, res } = createMocks({
      method: 'POST'
    });

    await gasPriceHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to fetch gas price'
    });
  });

  it('handles invalid response format', async () => {
    // Mock formatUnits to throw an error when given undefined
    const { formatUnits } = require('ethers');
    formatUnits.mockImplementation((value, unit) => {
      if (value === undefined) {
        throw new Error('Invalid value');
      }
      return value;
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        error: 'Invalid request'
        // No 'result' field
      }
    });

    const { req, res } = createMocks({
      method: 'POST'
    });

    await gasPriceHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Failed to fetch gas price'
    });
  });
});