/**
 * Test Data Generators and Fixtures
 * 
 * Centralized test data generation to ensure consistency across tests
 * and reduce duplication of test data creation.
 */

// =============================================================================
// DATA GENERATORS
// =============================================================================

/**
 * Generate a random Ethereum address
 * @param {string} prefix - Optional prefix for the address
 * @returns {string} - Valid Ethereum address
 */
export const generateAddress = (prefix = '0x') => {
  const chars = '0123456789abcdef';
  let address = prefix;
  
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return address;
};

/**
 * Generate a random transaction hash
 * @returns {string} - Valid transaction hash
 */
export const generateTxHash = () => {
  return generateAddress('0x');
};

/**
 * Generate a random block hash
 * @returns {string} - Valid block hash
 */
export const generateBlockHash = () => {
  return generateAddress('0x');
};

/**
 * Generate random gas price in Gwei
 * @param {number} min - Minimum gas price
 * @param {number} max - Maximum gas price
 * @returns {number} - Gas price in Gwei
 */
export const generateGasPrice = (min = 10, max = 100) => {
  return Math.random() * (max - min) + min;
};

/**
 * Generate random timestamp
 * @param {number} daysAgo - How many days ago (default: 0-7 days)
 * @returns {number} - Unix timestamp
 */
export const generateTimestamp = (daysAgo = Math.floor(Math.random() * 7)) => {
  return Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
};

// =============================================================================
// MOCK DATA FACTORIES
// =============================================================================

/**
 * Create mock block data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock block object
 */
export const createMockBlock = (overrides = {}) => {
  const defaults = {
    id: Math.floor(Math.random() * 1000000),
    hash: generateBlockHash(),
    number: Math.floor(Math.random() * 1000000),
    timestamp: generateTimestamp(),
    transactions: Math.floor(Math.random() * 20) + 1,
    gasUsed: Math.floor(Math.random() * 8000000).toString(),
    gasLimit: '8000000',
    miner: generateAddress(),
    difficulty: Math.floor(Math.random() * 1000000000000).toString(),
    size: Math.floor(Math.random() * 50000) + 1000,
    parentHash: generateBlockHash(),
    nonce: Math.floor(Math.random() * 1000000000000).toString(),
    extraData: '0x',
    logsBloom: '0x' + '0'.repeat(512),
    transactionsRoot: generateBlockHash(),
    stateRoot: generateBlockHash(),
    receiptsRoot: generateBlockHash()
  };
  
  return { ...defaults, ...overrides };
};

/**
 * Create mock transaction data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock transaction object
 */
export const createMockTransaction = (overrides = {}) => {
  const defaults = {
    id: Math.floor(Math.random() * 1000000),
    hash: generateTxHash(),
    from: generateAddress(),
    to: generateAddress(),
    value: (Math.random() * 10).toFixed(6),
    gasPrice: generateGasPrice().toFixed(2),
    gasUsed: Math.floor(Math.random() * 100000) + 21000,
    gasLimit: Math.floor(Math.random() * 200000) + 21000,
    timestamp: generateTimestamp(),
    status: Math.random() > 0.1 ? 'success' : 'failed',
    blockNumber: Math.floor(Math.random() * 1000000),
    blockHash: generateBlockHash(),
    transactionIndex: Math.floor(Math.random() * 20),
    nonce: Math.floor(Math.random() * 1000),
    input: '0x',
    logs: []
  };
  
  return { ...defaults, ...overrides };
};

/**
 * Create mock job order data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock job order object
 */
export const createMockJobOrder = (overrides = {}) => {
  const statuses = ['pending', 'processing', 'completed', 'failed'];
  const processingTypes = ['manual', 'upload'];
  
  const defaults = {
    id: `job_${Math.random().toString(36).substr(2, 9)}`,
    modelLocation: `https://example.com/model_${Math.random().toString(36).substr(2, 5)}.mnn`,
    processingType: processingTypes[Math.floor(Math.random() * processingTypes.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    timestamp: generateTimestamp(),
    estimatedCompletion: generateTimestamp(-1), // Future timestamp
    submittedBy: generateAddress(),
    gasPrice: generateGasPrice().toFixed(2),
    priority: Math.floor(Math.random() * 5) + 1,
    modelSize: Math.floor(Math.random() * 10000000) + 1000000, // 1-10MB
    progress: Math.floor(Math.random() * 101), // 0-100%
    logs: [],
    metadata: {
      framework: 'TensorFlow',
      version: '2.x',
      inputShape: [224, 224, 3],
      outputClasses: Math.floor(Math.random() * 1000) + 10
    }
  };
  
  return { ...defaults, ...overrides };
};

/**
 * Create mock wallet data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock wallet object
 */
export const createMockWallet = (overrides = {}) => {
  const defaults = {
    address: generateAddress(),
    balance: (Math.random() * 100).toFixed(6),
    chainId: 80002, // Polygon Amoy testnet
    isConnected: true,
    ensName: null,
    ensAvatar: null,
    nonce: Math.floor(Math.random() * 1000),
    transactions: []
  };
  
  return { ...defaults, ...overrides };
};

/**
 * Create mock gas price data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock gas price object
 */
export const createMockGasPrice = (overrides = {}) => {
  const defaults = {
    gasPrice: generateGasPrice(),
    timestamp: Date.now(),
    unit: 'gwei',
    fast: generateGasPrice(20, 50),
    standard: generateGasPrice(10, 30),
    safe: generateGasPrice(5, 20),
    baseFee: generateGasPrice(5, 15),
    priorityFee: generateGasPrice(1, 5)
  };
  
  return { ...defaults, ...overrides };
};

/**
 * Create mock analytics data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock analytics object
 */
export const createMockAnalytics = (overrides = {}) => {
  const defaults = {
    totalBlocks: Math.floor(Math.random() * 1000000) + 100000,
    totalTransactions: Math.floor(Math.random() * 10000000) + 1000000,
    averageGasPrice: generateGasPrice(),
    networkHashRate: `${Math.floor(Math.random() * 500) + 100} TH/s`,
    activeNodes: Math.floor(Math.random() * 100) + 10,
    averageBlockTime: Math.random() * 5 + 10, // 10-15 seconds
    pendingTransactions: Math.floor(Math.random() * 10000) + 100,
    networkUtilization: Math.random() * 100, // 0-100%
    dailyTransactions: Math.floor(Math.random() * 100000) + 10000,
    uniqueAddresses: Math.floor(Math.random() * 50000) + 5000
  };
  
  return { ...defaults, ...overrides };
};

/**
 * Create mock IPFS data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock IPFS object
 */
export const createMockIPFS = (overrides = {}) => {
  const defaults = {
    hash: `Qm${Math.random().toString(36).substr(2, 44)}`,
    size: Math.floor(Math.random() * 10000000) + 1000,
    timestamp: generateTimestamp(),
    peerId: `12D3KooW${Math.random().toString(36).substr(2, 40)}`,
    peers: Math.floor(Math.random() * 50) + 5,
    version: '0.20.0',
    connected: true,
    bandwidth: {
      totalIn: Math.floor(Math.random() * 1000000000),
      totalOut: Math.floor(Math.random() * 1000000000),
      rateIn: Math.floor(Math.random() * 1000000),
      rateOut: Math.floor(Math.random() * 1000000)
    }
  };
  
  return { ...defaults, ...overrides };
};

// =============================================================================
// BULK DATA GENERATORS
// =============================================================================

/**
 * Generate multiple mock blocks
 * @param {number} count - Number of blocks to generate
 * @param {Object} baseOverrides - Base properties to apply to all blocks
 * @returns {Array} - Array of mock block objects
 */
export const generateMockBlocks = (count = 10, baseOverrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createMockBlock({ 
      ...baseOverrides, 
      number: (baseOverrides.number || 1000000) - index,
      timestamp: generateTimestamp(index)
    })
  );
};

/**
 * Generate multiple mock transactions
 * @param {number} count - Number of transactions to generate
 * @param {Object} baseOverrides - Base properties to apply to all transactions
 * @returns {Array} - Array of mock transaction objects
 */
export const generateMockTransactions = (count = 20, baseOverrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createMockTransaction({ 
      ...baseOverrides,
      timestamp: generateTimestamp(index / 24) // Spread over hours
    })
  );
};

/**
 * Generate multiple mock job orders
 * @param {number} count - Number of job orders to generate
 * @param {Object} baseOverrides - Base properties to apply to all job orders
 * @returns {Array} - Array of mock job order objects
 */
export const generateMockJobOrders = (count = 5, baseOverrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createMockJobOrder({ 
      ...baseOverrides,
      timestamp: generateTimestamp(index)
    })
  );
};

// =============================================================================
// PRESET DATA COLLECTIONS
// =============================================================================

export const presetData = {
  // Empty states
  emptyBlocks: [],
  emptyTransactions: [],
  emptyJobOrders: [],
  
  // Error states
  errorResponse: {
    error: 'Internal Server Error',
    message: 'Something went wrong',
    code: 500
  },
  
  networkError: {
    error: 'Network Error',
    message: 'Failed to connect to server',
    code: 'NETWORK_ERROR'
  },
  
  // Loading states
  loadingState: {
    loading: true,
    data: null,
    error: null
  },
  
  // Success states
  successState: {
    loading: false,
    data: {},
    error: null
  },
  
  // Common test addresses
  testAddresses: {
    valid: '0x1234567890123456789012345678901234567890',
    invalid: '0xinvalid',
    zero: '0x0000000000000000000000000000000000000000',
    burn: '0x000000000000000000000000000000000000dEaD'
  },
  
  // Common test files
  testFiles: {
    validJson: { name: 'test.json', content: '{"test": "data"}', type: 'application/json' },
    invalidJson: { name: 'invalid.json', content: '{ invalid json }', type: 'application/json' },
    textFile: { name: 'test.txt', content: 'plain text', type: 'text/plain' },
    largeFile: { name: 'large.json', content: 'x'.repeat(10 * 1024 * 1024), type: 'application/json' }
  }
};
