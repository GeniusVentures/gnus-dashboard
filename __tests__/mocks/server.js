/**
 * Simple Mock Server Setup
 *
 * This file provides simple mock data for testing without external dependencies.
 */

// Simple mock data for testing
export const mockApiResponses = {
  blocks: [
    {
      id: 1,
      hash: '0xabc123def456',
      timestamp: Date.now() - 60000,
      transactions: 5
    },
    {
      id: 2,
      hash: '0xdef456abc123',
      timestamp: Date.now() - 120000,
      transactions: 3
    }
  ],

  gasPrice: '25.5',

  jobOrder: {
    id: 'job_123',
    status: 'completed',
    estimate: 150
  }
};
