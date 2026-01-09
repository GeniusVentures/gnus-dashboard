/**
 * React Toastify Mock
 * 
 * Centralized mock for react-toastify to avoid duplication across test files.
 * Provides configurable mock implementations for different toast scenarios.
 */

// Mock toast functions with tracking
const createMockToast = () => {
  const mockToast = jest.fn();
  
  // Add toast type methods
  mockToast.success = jest.fn();
  mockToast.error = jest.fn();
  mockToast.warning = jest.fn();
  mockToast.info = jest.fn();
  mockToast.dark = jest.fn();
  
  // Add utility methods
  mockToast.dismiss = jest.fn();
  mockToast.isActive = jest.fn().mockReturnValue(false);
  mockToast.update = jest.fn();
  mockToast.done = jest.fn();
  mockToast.onChange = jest.fn();
  mockToast.configure = jest.fn();
  
  // Add promise methods
  mockToast.promise = jest.fn().mockResolvedValue('Promise resolved');
  
  // Add loading method
  mockToast.loading = jest.fn();
  
  return mockToast;
};

// Mock ToastContainer component
const MockToastContainer = jest.fn(({ children, ...props }) => {
  return children || null;
});

// Mock toast hooks
const createMockUseToast = () => {
  return jest.fn(() => ({
    toast: createMockToast(),
    isLoading: false,
    data: null,
    error: null
  }));
};

// Mock Slide transition
const MockSlide = jest.fn(({ children, ...props }) => children);

// Mock Bounce transition
const MockBounce = jest.fn(({ children, ...props }) => children);

// Mock Flip transition
const MockFlip = jest.fn(({ children, ...props }) => children);

// Mock Zoom transition
const MockZoom = jest.fn(({ children, ...props }) => children);

// Complete mock module
const createReactToastifyMock = (config = {}) => {
  const {
    enableTracking = true,
    defaultPosition = 'top-right',
    defaultAutoClose = 5000
  } = config;

  const toast = createMockToast();
  
  // Add tracking if enabled
  if (enableTracking) {
    const originalMethods = {
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      dark: toast.dark
    };

    // Track toast calls
    Object.keys(originalMethods).forEach(method => {
      toast[method] = jest.fn((...args) => {
        const result = originalMethods[method](...args);
        
        // Store call information for testing
        if (!toast._calls) toast._calls = [];
        toast._calls.push({
          type: method,
          args,
          timestamp: Date.now()
        });
        
        return result;
      });
    });
  }

  return {
    toast,
    ToastContainer: MockToastContainer,
    Slide: MockSlide,
    Bounce: MockBounce,
    Flip: MockFlip,
    Zoom: MockZoom,
    cssTransition: jest.fn(),
    collapseToast: jest.fn(),
    useToast: createMockUseToast()
  };
};

// Pre-configured mock scenarios
export const toastScenarios = {
  // Default configuration
  default: () => createReactToastifyMock(),

  // With tracking disabled
  noTracking: () => createReactToastifyMock({ enableTracking: false }),

  // Success toast scenario
  successToast: () => {
    const mock = createReactToastifyMock();
    mock.toast.success.mockReturnValue('success-toast-id');
    return mock;
  },

  // Error toast scenario
  errorToast: () => {
    const mock = createReactToastifyMock();
    mock.toast.error.mockReturnValue('error-toast-id');
    return mock;
  },

  // Promise toast scenario
  promiseToast: () => {
    const mock = createReactToastifyMock();
    mock.toast.promise.mockImplementation((promise, messages) => {
      return promise.then(
        (result) => {
          mock.toast.success(messages.success || 'Success!');
          return result;
        },
        (error) => {
          mock.toast.error(messages.error || 'Error!');
          throw error;
        }
      );
    });
    return mock;
  },

  // Loading toast scenario
  loadingToast: () => {
    const mock = createReactToastifyMock();
    mock.toast.loading.mockReturnValue('loading-toast-id');
    return mock;
  },

  // Multiple toasts scenario
  multipleToasts: () => {
    const mock = createReactToastifyMock();
    let toastId = 0;
    
    ['success', 'error', 'warning', 'info'].forEach(type => {
      mock.toast[type].mockImplementation(() => `${type}-toast-${++toastId}`);
    });
    
    return mock;
  }
};

// Default export
export default createReactToastifyMock();

// Named exports for specific scenarios
export const {
  default: defaultToast,
  noTracking,
  successToast,
  errorToast,
  promiseToast,
  loadingToast,
  multipleToasts
} = toastScenarios;

// Utility functions for tests
export const toastTestUtils = {
  // Set up mock for a specific test
  setupMock: (scenario) => {
    const mock = typeof scenario === 'function' ? scenario() : scenario;
    
    jest.doMock('react-toastify', () => mock);
    
    return mock;
  },

  // Reset mock to default state
  resetMock: () => {
    jest.doMock('react-toastify', () => createReactToastifyMock());
  },

  // Create custom mock with specific overrides
  createCustomMock: (overrides) => {
    return createReactToastifyMock(overrides);
  },

  // Get toast call history
  getToastCalls: (mockToast) => {
    return mockToast._calls || [];
  },

  // Get calls for specific toast type
  getToastCallsByType: (mockToast, type) => {
    const calls = toastTestUtils.getToastCalls(mockToast);
    return calls.filter(call => call.type === type);
  },

  // Assert toast was called
  assertToastCalled: (mockToast, type, message) => {
    if (message) {
      expect(mockToast[type]).toHaveBeenCalledWith(
        expect.stringContaining(message),
        expect.any(Object)
      );
    } else {
      expect(mockToast[type]).toHaveBeenCalled();
    }
  },

  // Assert toast was not called
  assertToastNotCalled: (mockToast, type) => {
    expect(mockToast[type]).not.toHaveBeenCalled();
  },

  // Clear toast call history
  clearToastCalls: (mockToast) => {
    Object.keys(mockToast).forEach(key => {
      if (typeof mockToast[key] === 'function' && mockToast[key].mockClear) {
        mockToast[key].mockClear();
      }
    });
    if (mockToast._calls) {
      mockToast._calls = [];
    }
  },

  // Simulate toast promise resolution
  simulatePromiseSuccess: async (mockToast, promise, successMessage = 'Success!') => {
    const result = await promise;
    mockToast.success(successMessage);
    return result;
  },

  // Simulate toast promise rejection
  simulatePromiseError: async (mockToast, promise, errorMessage = 'Error!') => {
    try {
      await promise;
    } catch (error) {
      mockToast.error(errorMessage);
      throw error;
    }
  },

  // Get last toast call
  getLastToastCall: (mockToast) => {
    const calls = toastTestUtils.getToastCalls(mockToast);
    return calls[calls.length - 1];
  },

  // Count toast calls by type
  countToastCalls: (mockToast, type) => {
    if (type) {
      return mockToast[type].mock.calls.length;
    }
    
    // Count all toast calls
    return ['success', 'error', 'warning', 'info', 'dark']
      .reduce((total, toastType) => {
        return total + (mockToast[toastType].mock.calls.length || 0);
      }, 0);
  }
};
