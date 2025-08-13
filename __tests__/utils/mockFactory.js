/**
 * Mock Factory
 * 
 * Centralized factory for creating consistent, reusable mocks
 * across the GNUS Dashboard test suite.
 */

import { TEST_CONSTANTS } from './testSetup';

// =============================================================================
// MOCK CONFIGURATIONS
// =============================================================================

export const MOCK_CONFIGS = {
  WALLET_STATES: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
  },

  NETWORK_STATES: {
    POLYGON_AMOY: 'polygon-amoy',
    ETHEREUM_MAINNET: 'ethereum-mainnet',
    ETHEREUM_SEPOLIA: 'ethereum-sepolia'
  },

  API_RESPONSES: {
    SUCCESS: 'success',
    ERROR: 'error',
    LOADING: 'loading'
  },

  // Common mock data for reuse across tests
  MOCK_DATA: {
    ADDRESSES: {
      VALID: '0x1234567890123456789012345678901234567890',
      INVALID: '0xinvalid',
      ENS: 'test.eth'
    },
    CHAIN_IDS: {
      POLYGON_AMOY: 80002,
      ETHEREUM_MAINNET: 1,
      ETHEREUM_SEPOLIA: 11155111
    },
    BALANCES: {
      ZERO: '0',
      ONE_ETH: '1000000000000000000',
      TWO_ETH: '2000000000000000000'
    },
    TRANSACTION_HASHES: {
      VALID: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      PENDING: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    }
  }
};

// =============================================================================
// WALLET MOCKS
// =============================================================================

/**
 * Create Web3Modal mock with configurable state
 * @param {string} state - Wallet connection state
 * @param {Object} overrides - Custom overrides
 * @returns {Object} - Web3Modal mock
 */
export const createWeb3ModalMock = (state = MOCK_CONFIGS.WALLET_STATES.DISCONNECTED, overrides = {}) => {
  const baseConfig = {
    [MOCK_CONFIGS.WALLET_STATES.DISCONNECTED]: {
      useWeb3ModalAccount: () => ({
        isConnected: false,
        address: null,
        chainId: null,
        isConnecting: false
      }),
      useWeb3Modal: () => ({
        open: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      }),
      useWeb3ModalProvider: () => ({
        walletProvider: null
      })
    },

    [MOCK_CONFIGS.WALLET_STATES.CONNECTING]: {
      useWeb3ModalAccount: () => ({
        isConnected: false,
        address: null,
        chainId: null,
        isConnecting: true
      }),
      useWeb3Modal: () => ({
        open: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      }),
      useWeb3ModalProvider: () => ({
        walletProvider: null
      })
    },

    [MOCK_CONFIGS.WALLET_STATES.CONNECTED]: {
      useWeb3ModalAccount: () => ({
        isConnected: true,
        address: TEST_CONSTANTS.ADDRESSES.VALID,
        chainId: TEST_CONSTANTS.CHAIN_IDS.POLYGON_AMOY,
        isConnecting: false
      }),
      useWeb3Modal: () => ({
        open: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      }),
      useWeb3ModalProvider: () => ({
        walletProvider: {
          request: jest.fn().mockImplementation((params) => {
            switch (params.method) {
              case 'eth_requestAccounts':
                return Promise.resolve([TEST_CONSTANTS.ADDRESSES.VALID]);
              case 'eth_chainId':
                return Promise.resolve(`0x${TEST_CONSTANTS.CHAIN_IDS.POLYGON_AMOY.toString(16)}`);
              case 'eth_getBalance':
                return Promise.resolve('0x1bc16d674ec80000'); // 2 ETH
              default:
                return Promise.resolve(null);
            }
          }),
          on: jest.fn(),
          removeListener: jest.fn(),
          isMetaMask: true
        }
      })
    },

    [MOCK_CONFIGS.WALLET_STATES.ERROR]: {
      useWeb3ModalAccount: () => ({
        isConnected: false,
        address: null,
        chainId: null,
        isConnecting: false
      }),
      useWeb3Modal: () => ({
        open: jest.fn().mockRejectedValue(new Error('User rejected the request')),
        close: jest.fn().mockResolvedValue(undefined)
      }),
      useWeb3ModalProvider: () => ({
        walletProvider: null
      })
    }
  };

  const config = baseConfig[state] || baseConfig[MOCK_CONFIGS.WALLET_STATES.DISCONNECTED];
  
  // Apply overrides
  return {
    ...config,
    ...overrides
  };
};

// =============================================================================
// ROUTER MOCKS
// =============================================================================

/**
 * Create Next.js router mock
 * @param {Object} routerState - Initial router state
 * @param {Object} overrides - Custom overrides
 * @returns {Object} - Router mock
 */
export const createRouterMock = (routerState = {}, overrides = {}) => {
  const defaultState = {
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    isReady: true,
    ...routerState
  };

  const mockRouter = {
    ...defaultState,
    push: jest.fn().mockResolvedValue(true),
    replace: jest.fn().mockResolvedValue(true),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    reload: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    ...overrides
  };

  return {
    useRouter: () => mockRouter,
    withRouter: (Component) => Component,
    router: mockRouter
  };
};

// =============================================================================
// COMMON DEPENDENCY MOCKS
// =============================================================================

/**
 * Create react-toastify mock
 * @param {Object} config - Toast configuration
 * @returns {Object} - Toast mock
 */
export const createToastMock = (config = {}) => {
  const {
    enableLogging = false,
    simulateDelay = false
  } = config;

  const createToastFunction = (type) => jest.fn((message, options) => {
    if (enableLogging) {
      console.log(`Toast ${type}:`, message, options);
    }
    if (simulateDelay && options?.autoClose) {
      return new Promise(resolve => setTimeout(resolve, options.autoClose));
    }
    return Promise.resolve();
  });

  return {
    toast: {
      success: createToastFunction('success'),
      error: createToastFunction('error'),
      info: createToastFunction('info'),
      warning: createToastFunction('warning'),
      dismiss: jest.fn(),
      isActive: jest.fn().mockReturnValue(false),
      update: jest.fn()
    }
  };
};

/**
 * Create ethers mock with configurable behavior
 * @param {Object} config - Ethers configuration
 * @returns {Object} - Ethers mock
 */
export const createEthersMock = (config = {}) => {
  const {
    balance = MOCK_CONFIGS.MOCK_DATA.BALANCES.ONE_ETH,
    address = MOCK_CONFIGS.MOCK_DATA.ADDRESSES.VALID,
    chainId = MOCK_CONFIGS.MOCK_DATA.CHAIN_IDS.POLYGON_AMOY,
    simulateErrors = false
  } = config;

  const mockSigner = {
    getAddress: jest.fn().mockResolvedValue(address),
    getBalance: jest.fn().mockResolvedValue(balance),
    getChainId: jest.fn().mockResolvedValue(chainId),
    signMessage: jest.fn().mockResolvedValue('0xsignature'),
    sendTransaction: simulateErrors
      ? jest.fn().mockRejectedValue(new Error('Transaction failed'))
      : jest.fn().mockResolvedValue({ hash: MOCK_CONFIGS.MOCK_DATA.TRANSACTION_HASHES.VALID })
  };

  const mockProvider = {
    getSigner: jest.fn().mockResolvedValue(mockSigner),
    getNetwork: jest.fn().mockResolvedValue({ chainId, name: 'amoy' }),
    getBalance: jest.fn().mockResolvedValue(balance),
    getTransactionCount: jest.fn().mockResolvedValue(42),
    estimateGas: jest.fn().mockResolvedValue('21000'),
    getGasPrice: jest.fn().mockResolvedValue('25500000000') // 25.5 gwei
  };

  const mockContract = {
    balanceOf: jest.fn().mockResolvedValue(balance),
    transfer: simulateErrors
      ? jest.fn().mockRejectedValue(new Error('Transfer failed'))
      : jest.fn().mockResolvedValue({ hash: MOCK_CONFIGS.MOCK_DATA.TRANSACTION_HASHES.VALID }),
    approve: jest.fn().mockResolvedValue({ hash: MOCK_CONFIGS.MOCK_DATA.TRANSACTION_HASHES.VALID }),
    allowance: jest.fn().mockResolvedValue(balance)
  };

  return {
    ethers: {
      BrowserProvider: jest.fn().mockImplementation(() => mockProvider),
      Contract: jest.fn().mockImplementation(() => mockContract),
      formatUnits: jest.fn().mockImplementation((value, decimals = 18) => {
        // Simple mock implementation
        return (parseInt(value) / Math.pow(10, decimals)).toString();
      }),
      parseUnits: jest.fn().mockImplementation((value, decimals = 18) => {
        // Simple mock implementation
        return (parseFloat(value) * Math.pow(10, decimals)).toString();
      }),
      isAddress: jest.fn().mockImplementation((addr) => addr && addr.startsWith('0x') && addr.length === 42)
    }
  };
};

/**
 * Create axios mock with configurable responses
 * @param {Object} config - Axios configuration
 * @returns {Object} - Axios mock
 */
export const createAxiosMock = (config = {}) => {
  const {
    responses = {},
    simulateNetworkError = false,
    defaultDelay = 0
  } = config;

  const defaultResponses = {
    '/api/processing/getEstimate': { data: 150 },
    '/api/processing/submitJob': { data: { success: true, jobId: 'job_123' } },
    '/api/jobs/status': { data: { status: 'completed', progress: 100 } },
    ...responses
  };

  const createMockMethod = (method) => jest.fn().mockImplementation((url, data, config) => {
    if (simulateNetworkError) {
      return Promise.reject(new Error('Network Error'));
    }

    const response = defaultResponses[url] || { data: {} };

    if (defaultDelay > 0) {
      return new Promise(resolve =>
        setTimeout(() => resolve(response), defaultDelay)
      );
    }

    return Promise.resolve(response);
  });

  return {
    get: createMockMethod('get'),
    post: createMockMethod('post'),
    put: createMockMethod('put'),
    delete: createMockMethod('delete'),
    patch: createMockMethod('patch'),
    create: jest.fn().mockReturnThis(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };
};

/**
 * Create auto-animate mock
 * @returns {Object} - Auto-animate mock
 */
export const createAutoAnimateMock = () => ({
  useAutoAnimate: jest.fn(() => [null, jest.fn()])
});

/**
 * Create react-bootstrap mocks
 * @returns {Object} - React-bootstrap mocks
 */
export const createReactBootstrapMocks = () => ({
  Image: ({ src, height, className, alt }) => (
    React.createElement('img', { src, height, className, alt: alt || 'mock image' })
  ),
  Button: ({ children, onClick, variant, className }) => (
    React.createElement('button', { onClick, className: `btn btn-${variant} ${className}` }, children)
  ),
  Modal: ({ show, onHide, children }) => (
    show ? React.createElement('div', { className: 'modal', onClick: onHide }, children) : null
  ),
  Form: ({ children, onSubmit }) => (
    React.createElement('form', { onSubmit }, children)
  ),
  Container: ({ children, className }) => (
    React.createElement('div', { className: `container ${className}` }, children)
  ),
  Row: ({ children, className }) => (
    React.createElement('div', { className: `row ${className}` }, children)
  ),
  Col: ({ children, className }) => (
    React.createElement('div', { className: `col ${className}` }, children)
  )
});

// =============================================================================
// CENTRALIZED MOCK SETUP
// =============================================================================

/**
 * Setup all common mocks for a test suite
 * @param {Object} config - Mock configuration
 * @returns {Object} - All mock instances and cleanup functions
 */
export const setupCommonMocks = (config = {}) => {
  const {
    walletState = MOCK_CONFIGS.WALLET_STATES.DISCONNECTED,
    routerState = {},
    toastConfig = {},
    ethersConfig = {},
    axiosConfig = {},
    includeReactBootstrap = true,
    includeAutoAnimate = true
  } = config;

  // Create all mocks
  const web3ModalMock = createWeb3ModalMock(walletState);
  const routerMock = createRouterMock(routerState);
  const toastMock = createToastMock(toastConfig);
  const ethersMock = createEthersMock(ethersConfig);
  const axiosMock = createAxiosMock(axiosConfig);
  const autoAnimateMock = createAutoAnimateMock();
  const reactBootstrapMocks = createReactBootstrapMocks();

  // Setup Jest mocks
  jest.doMock('@web3modal/ethers/react', () => web3ModalMock);
  jest.doMock('next/router', () => routerMock);
  jest.doMock('react-toastify', () => toastMock);
  jest.doMock('ethers', () => ethersMock);
  jest.doMock('axios', () => axiosMock);

  if (includeAutoAnimate) {
    jest.doMock('@formkit/auto-animate/react', () => autoAnimateMock);
  }

  if (includeReactBootstrap) {
    jest.doMock('react-bootstrap', () => reactBootstrapMocks);
  }

  // Return mock instances for test access
  return {
    web3Modal: web3ModalMock,
    router: routerMock,
    toast: toastMock,
    ethers: ethersMock,
    axios: axiosMock,
    autoAnimate: autoAnimateMock,
    reactBootstrap: reactBootstrapMocks,

    // Cleanup function
    cleanup: () => {
      jest.clearAllMocks();
      jest.resetModules();
    }
  };
};

/**
 * Quick setup for common test scenarios
 */
export const QUICK_SETUPS = {
  // Disconnected wallet scenario
  disconnectedWallet: () => setupCommonMocks({
    walletState: MOCK_CONFIGS.WALLET_STATES.DISCONNECTED
  }),

  // Connected wallet scenario
  connectedWallet: () => setupCommonMocks({
    walletState: MOCK_CONFIGS.WALLET_STATES.CONNECTED
  }),

  // Error scenario
  errorScenario: () => setupCommonMocks({
    walletState: MOCK_CONFIGS.WALLET_STATES.ERROR,
    ethersConfig: { simulateErrors: true },
    axiosConfig: { simulateNetworkError: true }
  }),

  // Component testing scenario
  componentTesting: () => setupCommonMocks({
    walletState: MOCK_CONFIGS.WALLET_STATES.CONNECTED,
    includeReactBootstrap: true,
    includeAutoAnimate: true
  })
};

// =============================================================================
// API MOCKS
// =============================================================================

/**
 * Create fetch mock with configurable responses
 * @param {Object} responses - URL to response mapping
 * @param {Object} options - Mock configuration options
 * @returns {Function} - Fetch mock function
 */
export const createFetchMock = (responses = {}, options = {}) => {
  const {
    defaultDelay = 0,
    defaultStatus = 200,
    simulateNetworkError = false
  } = options;

  const defaultResponses = {
    '/api/processing/getEstimate': { 
      estimate: 150, 
      currency: 'MATIC',
      gasPrice: '25.5'
    },
    '/api/processing/submitJob': { 
      success: true, 
      jobId: 'job_123',
      status: 'pending'
    },
    '/api/jobs/status': {
      status: 'completed',
      progress: 100,
      result: 'success'
    },
    '/api/user/profile': {
      address: TEST_CONSTANTS.ADDRESSES.VALID,
      balance: '2.5',
      jobsCompleted: 42
    },
    ...responses
  };

  return jest.fn().mockImplementation(async (url, options = {}) => {
    // Simulate network delay
    if (defaultDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, defaultDelay));
    }

    // Simulate network error
    if (simulateNetworkError) {
      throw new Error('Network error');
    }

    // Find matching response
    const response = defaultResponses[url] || { success: true };
    const status = response._status || defaultStatus;
    const ok = status >= 200 && status < 300;

    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      blob: () => Promise.resolve(new Blob([JSON.stringify(response)])),
      headers: new Map([
        ['content-type', 'application/json']
      ])
    };
  });
};

// =============================================================================
// COMPONENT MOCKS
// =============================================================================

/**
 * Create mock component with configurable behavior
 * @param {string} name - Component name
 * @param {Object} props - Default props
 * @param {Function} render - Custom render function
 * @returns {Function} - Mock component
 */
export const createComponentMock = (name, props = {}, render = null) => {
  const MockComponent = (componentProps) => {
    const finalProps = { ...props, ...componentProps };
    
    if (render) {
      return render(finalProps);
    }
    
    return React.createElement('div', {
      'data-testid': name.toLowerCase(),
      'data-component': name,
      ...finalProps
    }, finalProps.children || name);
  };
  
  MockComponent.displayName = `Mock${name}`;
  return MockComponent;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a mock with automatic cleanup
 * @param {Function} mockFactory - Function that creates the mock
 * @param {Array} cleanupFunctions - Functions to call during cleanup
 * @returns {Object} - Mock with cleanup function
 */
export const createMockWithCleanup = (mockFactory, cleanupFunctions = []) => {
  const mock = mockFactory();
  
  return {
    mock,
    cleanup: () => {
      // Clear all jest mocks
      if (mock && typeof mock.mockClear === 'function') {
        mock.mockClear();
      }
      
      // Run custom cleanup functions
      cleanupFunctions.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.warn('Cleanup function failed:', error);
        }
      });
    }
  };
};

/**
 * Create a mock that automatically restores original implementation
 * @param {Object} target - Target object
 * @param {string} method - Method name to mock
 * @param {Function} implementation - Mock implementation
 * @returns {Object} - Mock with restore function
 */
export const createRestorableMock = (target, method, implementation) => {
  const original = target[method];
  const mock = jest.fn(implementation);
  
  target[method] = mock;
  
  return {
    mock,
    restore: () => {
      target[method] = original;
    }
  };
};

/**
 * Create a suite of related mocks
 * @param {Object} mockDefinitions - Object mapping names to mock factories
 * @returns {Object} - Suite of mocks with collective cleanup
 */
export const createMockSuite = (mockDefinitions) => {
  const mocks = {};
  const cleanupFunctions = [];
  
  Object.entries(mockDefinitions).forEach(([name, factory]) => {
    const mockWithCleanup = createMockWithCleanup(factory);
    mocks[name] = mockWithCleanup.mock;
    cleanupFunctions.push(mockWithCleanup.cleanup);
  });
  
  return {
    mocks,
    cleanup: () => {
      cleanupFunctions.forEach(fn => fn());
    }
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  createWeb3ModalMock,
  createRouterMock,
  createFetchMock,
  createComponentMock,
  createMockWithCleanup,
  createRestorableMock,
  createMockSuite,
  MOCK_CONFIGS
};
