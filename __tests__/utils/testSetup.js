/**
 * Enhanced Test Setup Utilities
 *
 * Centralized, optimized setup functions and configurations for consistent
 * test environments across the GNUS Dashboard test suite.
 */

import { setupCommonMocks, QUICK_SETUPS } from './mockFactory';

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

export const TEST_CONSTANTS = {
  TIMING: {
    DEFAULT_PERFORMANCE_TIME: 1000,
    DEFAULT_DATE_TIME: 1234567890000,
    DEFAULT_TIMEOUT: 10000,
    RENDER_TIMEOUT: 5000
  },
  ADDRESSES: {
    VALID: '0x1234567890123456789012345678901234567890',
    ZERO: '0x0000000000000000000000000000000000000000',
    BURN: '0x000000000000000000000000000000000000dEaD'
  },
  CHAIN_IDS: {
    POLYGON_AMOY: 80002,
    ETHEREUM_MAINNET: 1,
    ETHEREUM_SEPOLIA: 11155111
  }
};

// =============================================================================
// ENHANCED TIMING MOCKS
// =============================================================================

/**
 * Setup optimized timing mocks with better performance and cleanup
 * @param {Object} options - Timing configuration
 * @returns {Object} - Enhanced cleanup and utility functions
 */
export const setupTimingMocks = (options = {}) => {
  const {
    performanceTime = TEST_CONSTANTS.TIMING.DEFAULT_PERFORMANCE_TIME,
    dateTime = TEST_CONSTANTS.TIMING.DEFAULT_DATE_TIME,
    useRealTimers = false,
    enableAdvancedTimers = true
  } = options;

  // Store original functions for restoration
  const originalAPIs = {
    performanceNow: global.performance?.now,
    dateNow: global.Date.now,
    setTimeout: global.setTimeout,
    setInterval: global.setInterval
  };

  // Setup enhanced timing mocks
  if (!useRealTimers) {
    jest.useFakeTimers({
      advanceTimers: enableAdvancedTimers,
      doNotFake: ['nextTick', 'setImmediate']
    });
    jest.setSystemTime(new Date(dateTime));
  }

  // Enhanced performance mock with realistic behavior
  if (global.performance) {
    global.performance.now = jest.fn(() => performanceTime + Math.random() * 10);
  }

  global.Date.now = jest.fn(() => dateTime);

  return {
    cleanup: () => {
      if (!useRealTimers) {
        jest.useRealTimers();
      }
      // Restore original APIs
      Object.entries(originalAPIs).forEach(([key, originalFn]) => {
        if (originalFn) {
          if (key === 'performanceNow' && global.performance) {
            global.performance.now = originalFn;
          } else if (key === 'dateNow') {
            global.Date.now = originalFn;
          }
        }
      });
    },
    advance: (ms) => jest.advanceTimersByTime(ms),
    runAllTimers: () => jest.runAllTimers(),
    runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
    getTimerCount: () => jest.getTimerCount(),
    performanceTime,
    dateTime
  };
};

// =============================================================================
// ENHANCED CONSOLE MOCKS
// =============================================================================

/**
 * Setup intelligent console mocks with filtering and restoration
 * @param {Object} options - Console mock configuration
 * @returns {Object} - Enhanced cleanup functions and utilities
 */
export const setupConsoleMocks = (options = {}) => {
  const {
    methods = ['log', 'warn', 'error'],
    suppressAll = false,
    allowPatterns = [],
    blockPatterns = [/warning/i, /deprecated/i]
  } = options;

  const spies = new Map();
  const originalMethods = new Map();

  methods.forEach(method => {
    if (console[method]) {
      originalMethods.set(method, console[method]);

      const spy = jest.spyOn(console, method).mockImplementation((...args) => {
        const message = args.join(' ');

        // Allow specific patterns even when suppressing
        if (allowPatterns.some(pattern => pattern.test(message))) {
          originalMethods.get(method)(...args);
          return;
        }

        // Block specific patterns
        if (blockPatterns.some(pattern => pattern.test(message))) {
          return;
        }

        // If not suppressing all, call original
        if (!suppressAll) {
          originalMethods.get(method)(...args);
        }
      });

      spies.set(method, spy);
    }
  });

  return {
    spies: Object.fromEntries(spies),
    getCallsFor: (method) => spies.get(method)?.mock.calls || [],
    hasBeenCalledWith: (method, pattern) => {
      const calls = spies.get(method)?.mock.calls || [];
      return calls.some(call =>
        call.some(arg =>
          typeof arg === 'string' && pattern.test(arg)
        )
      );
    },
    cleanup: () => {
      spies.forEach((spy, method) => {
        console[method] = originalMethods.get(method);
        spy.mockRestore();
      });
      spies.clear();
      originalMethods.clear();
    }
  };
};

// =============================================================================
// API MOCKS
// =============================================================================

/**
 * Setup axios mocks for API testing
 * @param {Object} responses - Default responses for different methods
 * @returns {Object} - Mock functions and cleanup
 */
export const setupAxiosMocks = (responses = {}) => {
  const defaultResponses = {
    get: { data: { success: true } },
    post: { data: { success: true } },
    put: { data: { success: true } },
    delete: { data: { success: true } },
    ...responses
  };

  // Mock axios if not already mocked
  if (!jest.isMockFunction(require('axios').get)) {
    jest.mock('axios', () => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn()
    }));
  }

  const axios = require('axios');
  
  // Setup default responses
  Object.keys(defaultResponses).forEach(method => {
    if (axios[method]) {
      axios[method].mockResolvedValue(defaultResponses[method]);
    }
  });

  return {
    axios,
    mockResponse: (method, response) => {
      axios[method].mockResolvedValueOnce(response);
    },
    mockError: (method, error) => {
      axios[method].mockRejectedValueOnce(error);
    },
    cleanup: () => {
      Object.keys(axios).forEach(key => {
        if (jest.isMockFunction(axios[key])) {
          axios[key].mockClear();
        }
      });
    }
  };
};

// =============================================================================
// BROWSER API MOCKS
// =============================================================================

/**
 * Setup browser API mocks
 * @param {Object} options - Browser API configuration
 * @returns {Object} - Cleanup functions
 */
export const setupBrowserMocks = (options = {}) => {
  const {
    mockLocalStorage = true,
    mockSessionStorage = true,
    mockMatchMedia = true,
    mockResizeObserver = true,
    mockIntersectionObserver = true
  } = options;

  const originalAPIs = {};
  const cleanupFunctions = [];

  // Mock localStorage
  if (mockLocalStorage && !global.localStorage) {
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn()
    };
    
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    cleanupFunctions.push(() => {
      delete global.localStorage;
    });
  }

  // Mock sessionStorage
  if (mockSessionStorage && !global.sessionStorage) {
    const sessionStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn()
    };
    
    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });
    
    cleanupFunctions.push(() => {
      delete global.sessionStorage;
    });
  }

  // Mock matchMedia
  if (mockMatchMedia) {
    originalAPIs.matchMedia = global.matchMedia;
    global.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    
    cleanupFunctions.push(() => {
      global.matchMedia = originalAPIs.matchMedia;
    });
  }

  // Mock ResizeObserver
  if (mockResizeObserver) {
    originalAPIs.ResizeObserver = global.ResizeObserver;
    global.ResizeObserver = class ResizeObserver {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    
    cleanupFunctions.push(() => {
      global.ResizeObserver = originalAPIs.ResizeObserver;
    });
  }

  // Mock IntersectionObserver
  if (mockIntersectionObserver) {
    originalAPIs.IntersectionObserver = global.IntersectionObserver;
    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    
    cleanupFunctions.push(() => {
      global.IntersectionObserver = originalAPIs.IntersectionObserver;
    });
  }

  return {
    cleanup: () => {
      cleanupFunctions.forEach(fn => fn());
    }
  };
};

// =============================================================================
// COMBINED SETUP
// =============================================================================

/**
 * Setup complete test environment with all common mocks
 * @param {Object} options - Configuration options
 * @returns {Object} - All cleanup functions and utilities
 */
export const setupTestEnvironment = (options = {}) => {
  const {
    timing = {},
    console = {},
    api = {},
    browser = {}
  } = options;

  const timingSetup = setupTimingMocks(timing);
  const consoleSetup = setupConsoleMocks(console.methods);
  const apiSetup = setupAxiosMocks(api.responses);
  const browserSetup = setupBrowserMocks(browser);

  return {
    timing: timingSetup,
    console: consoleSetup,
    api: apiSetup,
    browser: browserSetup,
    
    // Combined cleanup function
    cleanup: () => {
      timingSetup.cleanup();
      consoleSetup.cleanup();
      apiSetup.cleanup();
      browserSetup.cleanup();
    }
  };
};

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Create a test wrapper for consistent test setup
 * @param {Function} testFn - Test function
 * @param {Object} setupOptions - Setup configuration
 * @returns {Function} - Wrapped test function
 */
export const withTestSetup = (testFn, setupOptions = {}) => {
  return async (...args) => {
    const setup = setupTestEnvironment(setupOptions);
    
    try {
      return await testFn(...args);
    } finally {
      setup.cleanup();
    }
  };
};

/**
 * Create a describe block with consistent setup
 * @param {string} description - Test suite description
 * @param {Function} testSuite - Test suite function
 * @param {Object} setupOptions - Setup configuration
 */
export const describeWithSetup = (description, testSuite, setupOptions = {}) => {
  describe(description, () => {
    let setup;

    beforeAll(() => {
      setup = setupTestEnvironment(setupOptions);
    });

    afterAll(() => {
      if (setup) {
        setup.cleanup();
      }
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    testSuite(setup);
  });
};

// =============================================================================
// STANDARDIZED TEST SUITE SETUP
// =============================================================================

/**
 * Create a standardized test suite with common setup and teardown
 * @param {string} suiteName - Name of the test suite
 * @param {Object} config - Configuration options
 * @param {Function} testSuite - Test suite function
 */
export const createStandardTestSuite = (suiteName, config = {}, testSuite) => {
  const {
    mockConfig = {},
    setupType = 'componentTesting',
    enableTimers = false,
    enableConsole = false,
    customSetup = null,
    customTeardown = null
  } = config;

  describe(suiteName, () => {
    let mocks;
    let timingSetup;
    let consoleSetup;

    beforeAll(() => {
      // Setup mocks based on configuration
      if (setupType && QUICK_SETUPS[setupType]) {
        mocks = QUICK_SETUPS[setupType]();
      } else {
        mocks = setupCommonMocks(mockConfig);
      }

      // Setup timing mocks if needed
      if (enableTimers) {
        timingSetup = setupTimingMocks();
      }

      // Setup console mocks if needed
      if (enableConsole) {
        consoleSetup = setupConsoleMocks();
      }

      // Custom setup
      if (customSetup) {
        customSetup(mocks);
      }
    });

    afterAll(() => {
      // Cleanup in reverse order
      if (customTeardown) {
        customTeardown(mocks);
      }

      if (consoleSetup) {
        consoleSetup.cleanup();
      }

      if (timingSetup) {
        timingSetup.cleanup();
      }

      if (mocks) {
        mocks.cleanup();
      }
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Run the actual test suite with access to mocks
    testSuite(mocks);
  });
};

/**
 * Quick setup functions for common test scenarios
 */
export const STANDARD_SETUPS = {
  // Component testing with connected wallet
  componentWithWallet: (suiteName, testSuite) =>
    createStandardTestSuite(suiteName, { setupType: 'connectedWallet' }, testSuite),

  // Component testing with disconnected wallet
  componentWithoutWallet: (suiteName, testSuite) =>
    createStandardTestSuite(suiteName, { setupType: 'disconnectedWallet' }, testSuite),

  // Error scenario testing
  errorTesting: (suiteName, testSuite) =>
    createStandardTestSuite(suiteName, { setupType: 'errorScenario' }, testSuite),

  // Performance testing
  performanceTesting: (suiteName, testSuite) =>
    createStandardTestSuite(suiteName, {
      setupType: 'componentTesting',
      enableTimers: true
    }, testSuite),

  // Unit testing (minimal setup)
  unitTesting: (suiteName, testSuite) =>
    createStandardTestSuite(suiteName, {
      mockConfig: { includeReactBootstrap: false, includeAutoAnimate: false }
    }, testSuite)
};
