import { createMocks } from 'node-mocks-http';
import gasPriceHandler from '../../../../pages/api/gas/gasPrice';
import axios from 'axios';

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
      'https://eth-mainnet.blastapi.io/bb92548d-1cc2-4d2a-b477-cb1473694cbd',
      { jsonrpc: '2.0', id: 0, method: 'eth_gasPrice' }
    );
  });

  it('handles API errors gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

    const { req, res } = createMocks({
      method: 'POST'
    });

    await gasPriceHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toBe('Error fetching gas price.');
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
  });
});
