import React from 'react';
import { render, screen } from '@testing-library/react';
import { IPFSWrapper, useIPFSContext } from '../../../context/ipfs/IPFSContext';

// Mock the useIPFS hook
jest.mock('../../../hooks/ipfs/useIPFS', () => ({
  __esModule: true,
  default: () => ({
    blockchainInfo: [{ block: 1, hash: 'hash1' }],
    transactionInfo: [{ txHash: 'tx1', type: 'Mint' }],
    isNodeStarted: true
  })
}));

// Create a test component that uses the IPFS context
const TestComponent = () => {
  const ipfsContext = useIPFSContext();
  return (
    <div>
      <div data-testid="node-status">
        {ipfsContext.isNodeStarted ? 'Node Started' : 'Node Not Started'}
      </div>
      <div data-testid="blockchain-info">
        {ipfsContext.blockchainInfo.length} blocks
      </div>
      <div data-testid="transaction-info">
        {ipfsContext.transactionInfo.length} transactions
      </div>
    </div>
  );
};

describe('IPFSContext', () => {
  it('provides IPFS context to child components', () => {
    render(
      <IPFSWrapper>
        <TestComponent />
      </IPFSWrapper>
    );
    
    expect(screen.getByTestId('node-status')).toHaveTextContent('Node Started');
    expect(screen.getByTestId('blockchain-info')).toHaveTextContent('1 blocks');
    expect(screen.getByTestId('transaction-info')).toHaveTextContent('1 transactions');
  });
});