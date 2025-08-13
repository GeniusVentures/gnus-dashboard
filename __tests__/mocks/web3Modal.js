/**
 * Web3Modal Mock
 * 
 * Centralized mock for @web3modal/ethers/react to avoid duplication across test files.
 * Provides configurable mock implementations for different test scenarios.
 */

// Default mock state
const defaultMockState = {
  isConnected: false,
  address: null,
  chainId: 80002, // Polygon Amoy testnet
  balance: '0',
  ensName: null,
  ensAvatar: null
};

// Mock wallet provider
const createMockWalletProvider = (overrides = {}) => ({
  request: jest.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890']),
  on: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  isMetaMask: true,
  isConnected: jest.fn().mockReturnValue(true),
  ...overrides
});

// Mock Web3Modal instance
const createMockWeb3Modal = (overrides = {}) => ({
  open: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  getState: jest.fn().mockReturnValue({
    open: false,
    selectedNetworkId: 80002
  }),
  subscribeState: jest.fn(),
  unsubscribeState: jest.fn(),
  ...overrides
});

// Mock account hook
const createMockUseWeb3ModalAccount = (state = defaultMockState) => ({
  useWeb3ModalAccount: jest.fn(() => ({
    isConnected: state.isConnected,
    address: state.address,
    chainId: state.chainId,
    balance: state.balance,
    ensName: state.ensName,
    ensAvatar: state.ensAvatar
  }))
});

// Mock provider hook
const createMockUseWeb3ModalProvider = (provider = null) => ({
  useWeb3ModalProvider: jest.fn(() => ({
    walletProvider: provider || createMockWalletProvider(),
    walletProviderType: 'injected'
  }))
});

// Mock events hook
const createMockUseWeb3ModalEvents = () => ({
  useWeb3ModalEvents: jest.fn(() => ({
    data: { event: 'CONNECT_SUCCESS', properties: {} },
    timestamp: Date.now()
  }))
});

// Mock theme hook
const createMockUseWeb3ModalTheme = () => ({
  useWeb3ModalTheme: jest.fn(() => ({
    themeMode: 'light',
    themeVariables: {},
    setThemeMode: jest.fn(),
    setThemeVariables: jest.fn()
  }))
});

// Complete mock module
const createWeb3ModalMock = (config = {}) => {
  const {
    accountState = defaultMockState,
    walletProvider = null,
    web3Modal = {},
    includeEvents = true,
    includeTheme = true
  } = config;

  const mock = {
    ...createMockUseWeb3ModalAccount(accountState),
    ...createMockUseWeb3ModalProvider(walletProvider),
    useWeb3Modal: jest.fn(() => createMockWeb3Modal(web3Modal))
  };

  if (includeEvents) {
    Object.assign(mock, createMockUseWeb3ModalEvents());
  }

  if (includeTheme) {
    Object.assign(mock, createMockUseWeb3ModalTheme());
  }

  return mock;
};

// Pre-configured mock scenarios
export const mockScenarios = {
  // Disconnected wallet
  disconnected: () => createWeb3ModalMock({
    accountState: {
      ...defaultMockState,
      isConnected: false,
      address: null
    }
  }),

  // Connected wallet
  connected: (address = '0x1234567890123456789012345678901234567890') => createWeb3ModalMock({
    accountState: {
      ...defaultMockState,
      isConnected: true,
      address,
      balance: '1.5'
    }
  }),

  // Connected with ENS
  connectedWithEns: (address = '0x1234567890123456789012345678901234567890', ensName = 'test.eth') => createWeb3ModalMock({
    accountState: {
      ...defaultMockState,
      isConnected: true,
      address,
      balance: '1.5',
      ensName,
      ensAvatar: 'https://example.com/avatar.png'
    }
  }),

  // Wrong network
  wrongNetwork: () => createWeb3ModalMock({
    accountState: {
      ...defaultMockState,
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      chainId: 1, // Ethereum mainnet instead of expected testnet
      balance: '1.5'
    }
  }),

  // Connection error
  connectionError: () => createWeb3ModalMock({
    accountState: defaultMockState,
    walletProvider: createMockWalletProvider({
      request: jest.fn().mockRejectedValue(new Error('User rejected the request'))
    }),
    web3Modal: {
      open: jest.fn().mockRejectedValue(new Error('Failed to open modal'))
    }
  }),

  // Network switching
  networkSwitching: () => createWeb3ModalMock({
    accountState: {
      ...defaultMockState,
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      chainId: 80002,
      balance: '1.5'
    },
    walletProvider: createMockWalletProvider({
      request: jest.fn().mockImplementation((params) => {
        if (params.method === 'wallet_switchEthereumChain') {
          return Promise.resolve();
        }
        if (params.method === 'wallet_addEthereumChain') {
          return Promise.resolve();
        }
        return Promise.resolve(['0x1234567890123456789012345678901234567890']);
      })
    })
  })
};

// Default export - disconnected state
export default createWeb3ModalMock();

// Named exports for specific scenarios
export const {
  disconnected,
  connected,
  connectedWithEns,
  wrongNetwork,
  connectionError,
  networkSwitching
} = mockScenarios;

// Utility functions for tests
export const web3ModalTestUtils = {
  // Set up mock for a specific test
  setupMock: (scenario) => {
    const mock = typeof scenario === 'function' ? scenario() : scenario;
    
    jest.doMock('@web3modal/ethers/react', () => mock);
    
    return mock;
  },

  // Reset mock to default state
  resetMock: () => {
    jest.doMock('@web3modal/ethers/react', () => createWeb3ModalMock());
  },

  // Create custom mock with specific overrides
  createCustomMock: (overrides) => {
    return createWeb3ModalMock(overrides);
  },

  // Simulate wallet events
  simulateWalletEvent: (mockProvider, event, data) => {
    const eventHandlers = mockProvider.on.mock.calls
      .filter(call => call[0] === event)
      .map(call => call[1]);
    
    eventHandlers.forEach(handler => handler(data));
  },

  // Simulate account change
  simulateAccountChange: (mockProvider, newAccounts) => {
    web3ModalTestUtils.simulateWalletEvent(mockProvider, 'accountsChanged', newAccounts);
  },

  // Simulate chain change
  simulateChainChange: (mockProvider, newChainId) => {
    web3ModalTestUtils.simulateWalletEvent(mockProvider, 'chainChanged', newChainId);
  },

  // Simulate disconnect
  simulateDisconnect: (mockProvider) => {
    web3ModalTestUtils.simulateWalletEvent(mockProvider, 'disconnect', {});
  }
};
