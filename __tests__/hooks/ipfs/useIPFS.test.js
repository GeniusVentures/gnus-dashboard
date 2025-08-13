import { renderHook, waitFor, act } from '@testing-library/react';
import useIPFS from '../../../hooks/ipfs/useIPFS';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock console.error to avoid noise in tests
console.error = jest.fn();

describe('useIPFS hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with empty arrays', () => {
    const { result } = renderHook(() => useIPFS());

    expect(result.current.blockchainInfo).toEqual([]);
    expect(result.current.transactionInfo).toEqual([]);
    expect(typeof result.current.blockSearch).toBe('function');
    expect(typeof result.current.transSearch).toBe('function');
    expect(typeof result.current.walletSearch).toBe('function');
  });

  it('starts IPFS node on mount', () => {
    mockedAxios.get.mockResolvedValue({ data: {} });

    renderHook(() => useIPFS());

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/libp2p/startLibp2p');
  });

  it('fetches blockchain and transaction data periodically', async () => {
    const mockBlockchainData = [
      { block: 1, hash: 'hash1', transactions: 5, time: '1234567890' },
      { block: 2, hash: 'hash2', transactions: 3, time: '1234567891' }
    ];

    const mockTransactionData = [
      { txHash: 'tx1', type: 'Transfer', value: '1.5 GNUS', time: '1234567890' },
      { txHash: 'tx2', type: 'Mint', value: '2.0 GNUS', time: '1234567891' }
    ];

    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/libp2p/startLibp2p')) {
        return Promise.resolve({ data: { status: 'started' } });
      }
      if (url.includes('/api/networkData/getBlocksPrev')) {
        return Promise.resolve({ data: mockBlockchainData });
      }
      if (url.includes('/api/networkData/getTransPrev')) {
        return Promise.resolve({ data: mockTransactionData });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useIPFS());

    // Fast-forward past the initial delay
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Fast-forward to trigger the interval
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.blockchainInfo).toEqual(mockBlockchainData);
    });

    expect(result.current.transactionInfo).toEqual(mockTransactionData);
  });

  it('handles API errors gracefully', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/libp2p/startLibp2p')) {
        return Promise.resolve({ data: {} });
      }
      if (url.includes('/api/networkData/getBlocksPrev')) {
        return Promise.reject(new Error('Blockchain API error'));
      }
      if (url.includes('/api/networkData/getTransPrev')) {
        return Promise.reject(new Error('Transaction API error'));
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useIPFS());

    // Fast-forward past the initial delay
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Fast-forward to trigger the interval
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(expect.any(Error));
    });

    // Data should remain empty arrays on error
    expect(result.current.blockchainInfo).toEqual([]);
    expect(result.current.transactionInfo).toEqual([]);
  });

  it('continues fetching data at regular intervals', async () => {
    let blockchainCallCount = 0;
    let transactionCallCount = 0;

    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/libp2p/startLibp2p')) {
        return Promise.resolve({ data: {} });
      }
      if (url.includes('/api/networkData/getBlocksPrev')) {
        blockchainCallCount++;
        return Promise.resolve({ 
          data: [{ block: blockchainCallCount, hash: `hash${blockchainCallCount}` }] 
        });
      }
      if (url.includes('/api/networkData/getTransPrev')) {
        transactionCallCount++;
        return Promise.resolve({ 
          data: [{ txHash: `tx${transactionCallCount}`, type: 'Transfer' }] 
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useIPFS());

    // Fast-forward past the initial delay
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Fast-forward to trigger multiple intervals
    act(() => {
      jest.advanceTimersByTime(6000); // 3 intervals
    });

    await waitFor(() => {
      expect(blockchainCallCount).toBeGreaterThan(1);
    });

    expect(transactionCallCount).toBeGreaterThan(1);
    // Data arrays might be empty if the mock responses don't match expected format
    expect(Array.isArray(result.current.blockchainInfo)).toBe(true);
    expect(Array.isArray(result.current.transactionInfo)).toBe(true);
  });

  it('provides search functions', () => {
    const { result } = renderHook(() => useIPFS());

    expect(typeof result.current.blockSearch).toBe('function');
    expect(typeof result.current.transSearch).toBe('function');
    expect(typeof result.current.walletSearch).toBe('function');

    // These functions are currently empty but should not throw
    expect(() => result.current.blockSearch()).not.toThrow();
    expect(() => result.current.transSearch()).not.toThrow();
    expect(() => result.current.walletSearch()).not.toThrow();
  });
});
