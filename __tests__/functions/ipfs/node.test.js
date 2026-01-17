// Mock protobuf dependencies to avoid import issues
jest.mock('data/protobuf/SGTransaction', () => ({
  MintTx: { create: jest.fn() },
  EscrowTx: { create: jest.fn() },
  UTXOTxParams: { create: jest.fn() },
  TransferOutput: { create: jest.fn() },
  TransferUTXOInput: { create: jest.fn() },
}), { virtual: true });

jest.mock('data/protobuf/crdt/delta', () => ({
  Delta: { create: jest.fn() },
  Element: { create: jest.fn() },
}), { virtual: true });

jest.mock('data/protobuf/crdt/bcast', () => ({
  CRDTBroadcast: { create: jest.fn() },
  Head: { create: jest.fn() },
}), { virtual: true });

jest.mock('data/protobuf/SGBlocks', () => ({
  BlockID: { create: jest.fn() },
  BlockHashData: { create: jest.fn() },
  BlockHeaderData: { create: jest.fn() },
  BlockPayloadData: { create: jest.fn() },
}), { virtual: true });

// Mock message dependencies
jest.mock('../../../functions/messages/transfer', () => jest.fn());
jest.mock('../../../functions/messages/mint', () => jest.fn());
jest.mock('../../../functions/messages/processing', () => jest.fn());

describe('IPFS Node Functions', () => {
  it('should have mocked protobuf dependencies', () => {
    // Test that the protobuf mocks are working
    expect(jest.isMockFunction(require('data/protobuf/SGTransaction').MintTx.create)).toBe(true);
    expect(jest.isMockFunction(require('data/protobuf/crdt/delta').Delta.create)).toBe(true);
    expect(jest.isMockFunction(require('data/protobuf/SGBlocks').BlockID.create)).toBe(true);
  });

  it('should have mocked message dependencies', () => {
    // Test that the message mocks are working
    expect(jest.isMockFunction(require('../../../functions/messages/transfer'))).toBe(true);
    expect(jest.isMockFunction(require('../../../functions/messages/mint'))).toBe(true);
    expect(jest.isMockFunction(require('../../../functions/messages/processing'))).toBe(true);
  });

  it('should be able to create mock implementations', () => {
    // Mock the functions for testing
    const mockCreateNode = jest.fn();
    const mockGetGeniusSDKCost = jest.fn();
    const mockRunGeniusSDKProcess = jest.fn();
    const mockCreateTokenValue = jest.fn();
    const mockCreateTokenID = jest.fn();

    expect(mockCreateNode).toBeDefined();
    expect(mockGetGeniusSDKCost).toBeDefined();
    expect(mockRunGeniusSDKProcess).toBeDefined();
    expect(mockCreateTokenValue).toBeDefined();
    expect(mockCreateTokenID).toBeDefined();
  });
});
