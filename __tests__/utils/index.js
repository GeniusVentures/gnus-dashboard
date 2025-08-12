/**
 * Test Utilities for GNUS Dashboard
 *
 * Centralized utilities and helpers for testing to reduce code duplication
 * and provide consistent testing patterns across the test suite.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import enhanced utilities
import { setupCommonMocks, QUICK_SETUPS } from './mockFactory';
import { createStandardTestSuite, STANDARD_SETUPS } from './testSetup';
import * as standardPatterns from './standardTestPatterns';

// Legacy imports for backward compatibility
import { web3ModalTestUtils } from '../mocks/web3Modal';
import { routerTestUtils } from '../mocks/nextRouter';
import { toastTestUtils } from '../mocks/reactToastify';

// Common test data
export const testData = {
  // Mock wallet addresses
  addresses: {
    valid: '0x1234567890123456789012345678901234567890',
    invalid: '0xinvalid',
    zero: '0x0000000000000000000000000000000000000000'
  },
  
  // Mock blockchain data
  blocks: [
    {
      id: 1,
      hash: '0xabc123def456',
      timestamp: Date.now() - 60000,
      transactions: 5,
      gasUsed: '21000',
      gasLimit: '8000000'
    },
    {
      id: 2,
      hash: '0xdef456abc123',
      timestamp: Date.now() - 120000,
      transactions: 3,
      gasUsed: '42000',
      gasLimit: '8000000'
    }
  ],
  
  // Mock transactions
  transactions: [
    {
      id: 1,
      hash: '0x123abc456def',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      value: '1.5',
      gasPrice: '20',
      gasUsed: '21000',
      timestamp: Date.now() - 30000,
      status: 'success'
    }
  ],
  
  // Mock job order data
  jobOrders: [
    {
      id: 'job_123',
      modelLocation: 'https://example.com/model.mnn',
      processingType: 'manual',
      status: 'pending',
      timestamp: Date.now()
    }
  ],
  
  // Mock file data
  files: {
    validJson: new File(['{"test": "data"}'], 'test.json', { type: 'application/json' }),
    invalidJson: new File(['{ invalid json }'], 'invalid.json', { type: 'application/json' }),
    largeFile: new File(['x'.repeat(10 * 1024 * 1024)], 'large.json', { type: 'application/json' }),
    textFile: new File(['plain text'], 'test.txt', { type: 'text/plain' })
  }
};

// Rendering utilities
export const renderUtils = {
  // Render with common providers
  renderWithProviders: (ui, options = {}) => {
    const {
      walletState = 'disconnected',
      routerState = 'home',
      toastConfig = 'default',
      ...renderOptions
    } = options;

    // Set up mocks based on state
    web3ModalTestUtils.setupMock(walletState);
    routerTestUtils.setupMock(routerState);
    toastTestUtils.setupMock(toastConfig);

    return render(ui, renderOptions);
  },

  // Render with user event setup
  renderWithUserEvent: (ui, options = {}) => {
    const user = userEvent.setup();
    const renderResult = renderUtils.renderWithProviders(ui, options);
    
    return {
      user,
      ...renderResult
    };
  },

  // Render and wait for loading to complete
  renderAndWaitForLoad: async (ui, options = {}) => {
    const renderResult = renderUtils.renderWithProviders(ui, options);
    
    // Wait for any loading indicators to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    return renderResult;
  }
};

// Form testing utilities
export const formUtils = {
  // Fill out a form with test data
  fillForm: async (formData, user = userEvent.setup()) => {
    for (const [fieldName, value] of Object.entries(formData)) {
      const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                   screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                   screen.getByDisplayValue('');
      
      if (field.type === 'file') {
        await user.upload(field, value);
      } else if (field.type === 'checkbox' || field.type === 'radio') {
        if (value) {
          await user.click(field);
        }
      } else {
        await user.clear(field);
        await user.type(field, value.toString());
      }
    }
  },

  // Submit a form
  submitForm: async (user = userEvent.setup()) => {
    const submitButton = screen.getByRole('button', { name: /submit/i }) ||
                        screen.getByText(/submit/i);
    await user.click(submitButton);
  },

  // Validate form errors
  expectFormErrors: (expectedErrors) => {
    expectedErrors.forEach(error => {
      expect(screen.getByText(new RegExp(error, 'i'))).toBeInTheDocument();
    });
  },

  // Validate form success
  expectFormSuccess: (successMessage) => {
    expect(screen.getByText(new RegExp(successMessage, 'i'))).toBeInTheDocument();
  }
};

// Async testing utilities
export const asyncUtils = {
  // Wait for element to appear
  waitForElement: async (selector, options = {}) => {
    const { timeout = 5000, ...waitOptions } = options;
    
    return await waitFor(() => {
      const element = typeof selector === 'string' 
        ? screen.getByTestId(selector)
        : selector();
      expect(element).toBeInTheDocument();
      return element;
    }, { timeout, ...waitOptions });
  },

  // Wait for element to disappear
  waitForElementToDisappear: async (selector, options = {}) => {
    const { timeout = 5000, ...waitOptions } = options;
    
    return await waitFor(() => {
      const element = typeof selector === 'string'
        ? screen.queryByTestId(selector)
        : selector();
      expect(element).not.toBeInTheDocument();
    }, { timeout, ...waitOptions });
  },

  // Wait for API call to complete
  waitForApiCall: async (mockFetch, endpoint, options = {}) => {
    const { timeout = 5000, method = 'GET' } = options;
    
    return await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(endpoint),
        expect.objectContaining({ method })
      );
    }, { timeout });
  },

  // Wait for multiple conditions
  waitForAll: async (conditions, options = {}) => {
    const { timeout = 5000 } = options;
    
    return await waitFor(() => {
      conditions.forEach(condition => {
        if (typeof condition === 'function') {
          condition();
        } else {
          expect(condition).toBeTruthy();
        }
      });
    }, { timeout });
  }
};

// Mock utilities
export const mockUtils = {
  // Create mock API response
  createMockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data))
  }),

  // Mock fetch with responses
  mockFetchResponses: (responses) => {
    global.fetch = jest.fn().mockImplementation((url, options = {}) => {
      const method = options.method || 'GET';
      const key = `${method} ${url}`;
      
      const response = responses[key] || responses[url] || responses.default;
      
      if (!response) {
        return Promise.reject(new Error(`No mock response for ${key}`));
      }
      
      return Promise.resolve(mockUtils.createMockApiResponse(response.data, response.status));
    });
  },

  // Reset all mocks
  resetAllMocks: () => {
    jest.clearAllMocks();
    web3ModalTestUtils.resetMock();
    routerTestUtils.resetMock();
    toastTestUtils.resetMock();
  }
};

// Accessibility testing utilities
export const a11yUtils = {
  // Check for basic accessibility requirements
  checkBasicA11y: () => {
    // Check for alt text on images
    const images = screen.getAllByRole('img', { hidden: true });
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });

    // Check for labels on form inputs
    const inputs = screen.getAllByRole('textbox', { hidden: true });
    inputs.forEach(input => {
      const hasLabel = input.getAttribute('aria-label') ||
                      input.getAttribute('aria-labelledby') ||
                      screen.queryByLabelText(input.placeholder || '');
      expect(hasLabel).toBeTruthy();
    });
  },

  // Test keyboard navigation
  testKeyboardNavigation: async (user = userEvent.setup()) => {
    // Get all focusable elements
    const focusableElements = screen.getAllByRole('button')
      .concat(screen.getAllByRole('link'))
      .concat(screen.getAllByRole('textbox'))
      .concat(screen.getAllByRole('combobox'));

    // Test tab navigation
    for (let i = 0; i < focusableElements.length; i++) {
      await user.tab();
      expect(document.activeElement).toBe(focusableElements[i]);
    }
  },

  // Check color contrast (basic check)
  checkColorContrast: () => {
    const elements = screen.getAllByText(/./);
    elements.forEach(element => {
      const styles = window.getComputedStyle(element);
      expect(styles.color).toBeTruthy();
      expect(styles.backgroundColor).toBeTruthy();
    });
  }
};

// Performance testing utilities
export const performanceUtils = {
  // Measure render time
  measureRenderTime: async (component) => {
    const start = performance.now();
    render(component);
    await waitFor(() => {
      expect(screen.getByRole('main') || screen.getByTestId('app')).toBeInTheDocument();
    });
    const end = performance.now();
    return end - start;
  },

  // Measure re-render time
  measureReRenderTime: async (initialComponent, updatedComponent) => {
    const { rerender } = render(initialComponent);
    
    const start = performance.now();
    rerender(updatedComponent);
    await waitFor(() => {
      expect(screen.getByRole('main') || screen.getByTestId('app')).toBeInTheDocument();
    });
    const end = performance.now();
    return end - start;
  }
};

// Export all utilities
export {
  web3ModalTestUtils,
  routerTestUtils,
  toastTestUtils
};

// =============================================================================
// ENHANCED TEST UTILITIES (New Architecture)
// =============================================================================

// Enhanced test setup and patterns
export * from './testSetup';
export * from './testPatterns';
export * from './e2eTestBase';
export * from './mockFactory';

// Convenience exports for new architecture
export { TEST_CONSTANTS } from './testSetup';
export { createE2ETestSuite, E2ETestBase } from './e2eTestBase';
export { createWeb3ModalMock, createRouterMock, createFetchMock, MOCK_CONFIGS } from './mockFactory';
export {
  createComponentTestSuite,
  createFormTestSuite,
  createAsyncTestSuite,
  withTestSetup,
  describeWithSetup
} from './testPatterns';

// =============================================================================
// LEGACY UTILITIES (Maintained for compatibility)
// =============================================================================

// Re-export legacy test data utilities
export * from './testData';

// Re-export legacy component testing utilities
export * from './componentHelpers';

// Re-export legacy API testing utilities
export * from './apiHelpers';

// =============================================================================
// UNIFIED TEST UTILITIES
// =============================================================================

/**
 * Modern test utilities combining legacy and new patterns
 */
export const TestSuite = {
  // E2E testing
  e2e: {
    create: createE2ETestSuite,
    base: E2ETestBase
  },

  // Component testing
  component: {
    create: createComponentTestSuite,
    render: renderUtils.renderWithProviders,
    renderWithUser: renderUtils.renderWithUserEvent
  },

  // Form testing
  form: {
    create: createFormTestSuite,
    fill: formUtils.fillForm,
    submit: formUtils.submitForm,
    expectErrors: formUtils.expectFormErrors
  },

  // Async testing
  async: {
    create: createAsyncTestSuite,
    waitFor: asyncUtils.waitForElement,
    waitForDisappear: asyncUtils.waitForElementToDisappear
  },

  // Mock utilities
  mocks: {
    web3Modal: createWeb3ModalMock,
    router: createRouterMock,
    fetch: createFetchMock,
    reset: mockUtils.resetAllMocks
  },

  // Constants and data
  constants: TEST_CONSTANTS,
  data: testData
};

// =============================================================================
// ENHANCED TEST UTILITIES (New Architecture)
// =============================================================================

/**
 * Enhanced test utilities with modern patterns
 */
export const EnhancedTestUtils = {
  // Mock setup utilities
  setupMocks: setupCommonMocks,
  quickSetups: QUICK_SETUPS,

  // Test suite creation
  createSuite: createStandardTestSuite,
  standardSetups: STANDARD_SETUPS,

  // Test patterns
  patterns: {
    component: standardPatterns.createComponentRenderTests,
    form: standardPatterns.createFormTestPatterns,
    async: standardPatterns.createAsyncTestPatterns,
    performance: standardPatterns.createPerformanceTestPatterns
  },

  // Convenience methods for common scenarios
  testComponent: (Component, options = {}) => {
    return standardPatterns.createComponentRenderTests(Component, options);
  },

  testForm: (options = {}) => {
    return standardPatterns.createFormTestPatterns(options);
  },

  // Quick test suite creators
  createComponentSuite: (name, Component, options = {}) => {
    return createStandardTestSuite(name, {
      setupType: 'componentTesting',
      ...options
    }, (mocks) => {
      const renderTests = standardPatterns.createComponentRenderTests(Component, options);

      describe('Component Rendering', () => {
        Object.entries(renderTests).forEach(([testName, testFn]) => {
          it(testName, testFn);
        });
      });
    });
  },

  createFormSuite: (name, Component, formOptions = {}, suiteOptions = {}) => {
    return createStandardTestSuite(name, {
      setupType: 'componentTesting',
      ...suiteOptions
    }, (mocks) => {
      const formTests = standardPatterns.createFormTestPatterns(formOptions);

      describe('Form Testing', () => {
        Object.entries(formTests).forEach(([testName, testFn]) => {
          it(testName, testFn);
        });
      });
    });
  }
};

// Export everything for easy access
export {
  // Enhanced utilities
  setupCommonMocks,
  QUICK_SETUPS,
  createStandardTestSuite,
  STANDARD_SETUPS,
  standardPatterns,

  // Legacy utilities (for backward compatibility)
  web3ModalTestUtils,
  routerTestUtils,
  toastTestUtils
};
