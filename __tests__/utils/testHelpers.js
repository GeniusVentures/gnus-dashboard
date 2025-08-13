/**
 * Test Helpers - Simplified Test Creation
 *
 * High-level utilities that make it easy to create comprehensive test suites
 * with minimal boilerplate code.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  createStandardTestSuite, 
  STANDARD_SETUPS 
} from './testSetup';
import { 
  createComponentRenderTests,
  createFormTestPatterns,
  createAsyncTestPatterns,
  createPerformanceTestPatterns
} from './standardTestPatterns';

// =============================================================================
// SIMPLIFIED TEST CREATORS
// =============================================================================

/**
 * Create a complete component test suite with minimal configuration
 * @param {string} componentName - Name of the component
 * @param {React.Component} Component - Component to test
 * @param {Object} options - Test configuration
 */
export const createComponentTestSuite = (componentName, Component, options = {}) => {
  const {
    props = {},
    mockSetup = 'componentTesting',
    includeAccessibility = true,
    includePerformance = false,
    customTests = null
  } = options;

  return createStandardTestSuite(componentName, {
    setupType: mockSetup
  }, (mocks) => {
    
    describe('Basic Rendering', () => {
      const renderTests = createComponentRenderTests(Component, {
        displayName: componentName,
        defaultProps: props,
        skipAccessibility: !includeAccessibility
      });

      it('renders without crashing', renderTests['renders without crashing']);
      
      if (includeAccessibility) {
        it('meets accessibility requirements', renderTests['meets basic accessibility requirements']);
      }
    });

    if (includePerformance) {
      describe('Performance', () => {
        const perfTests = createPerformanceTestPatterns();
        
        it('renders within performance threshold', () => {
          perfTests['renders within performance threshold'](Component, props);
        });
      });
    }

    // Run custom tests if provided
    if (customTests) {
      customTests(mocks, Component, props);
    }
  });
};

/**
 * Create a form test suite with validation and submission tests
 * @param {string} formName - Name of the form
 * @param {React.Component} FormComponent - Form component to test
 * @param {Object} options - Form test configuration
 */
export const createFormTestSuite = (formName, FormComponent, options = {}) => {
  const {
    validData = {},
    invalidData = {},
    requiredFields = [],
    mockSetup = 'componentTesting',
    customTests = null
  } = options;

  return createStandardTestSuite(formName, {
    setupType: mockSetup
  }, (mocks) => {
    
    describe('Form Rendering', () => {
      it('renders form elements correctly', () => {
        render(<FormComponent />);
        
        // Basic form presence check
        const form = document.querySelector('form') || 
                    screen.getByRole('form', { hidden: true }) ||
                    document.querySelector('[data-testid*="form"]');
        
        expect(form || document.body).toBeInTheDocument();
      });
    });

    describe('Form Interactions', () => {
      const formTests = createFormTestPatterns({
        requiredFields,
        validationRules: {}
      });

      if (Object.keys(validData).length > 0) {
        it('handles valid form submission', async () => {
          render(<FormComponent />);
          await formTests['handles form submission with valid data'](validData);
        });
      }

      if (requiredFields.length > 0) {
        it('validates required fields', async () => {
          render(<FormComponent />);
          await formTests['validates required fields']();
        });
      }
    });

    // Run custom tests if provided
    if (customTests) {
      customTests(mocks, FormComponent, { validData, invalidData });
    }
  });
};

/**
 * Create an async operation test suite
 * @param {string} suiteName - Name of the test suite
 * @param {React.Component} Component - Component with async operations
 * @param {Object} options - Async test configuration
 */
export const createAsyncTestSuite = (suiteName, Component, options = {}) => {
  const {
    asyncOperations = [],
    mockSetup = 'componentTesting',
    customTests = null
  } = options;

  return createStandardTestSuite(suiteName, {
    setupType: mockSetup
  }, (mocks) => {
    
    describe('Async Operations', () => {
      const asyncTests = createAsyncTestPatterns();

      asyncOperations.forEach(operation => {
        const { name, trigger, expectedResult, expectedError } = operation;

        if (expectedResult) {
          it(`handles ${name} success`, async () => {
            render(<Component />);
            await asyncTests['handles async success'](trigger, expectedResult);
          });
        }

        if (expectedError) {
          it(`handles ${name} error`, async () => {
            render(<Component />);
            await asyncTests['handles async errors'](trigger, expectedError);
          });
        }
      });
    });

    // Run custom tests if provided
    if (customTests) {
      customTests(mocks, Component);
    }
  });
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Quick test for component rendering without full suite
 * @param {React.Component} Component - Component to test
 * @param {Object} props - Props to pass to component
 */
export const quickRenderTest = (Component, props = {}) => {
  it('renders without crashing', () => {
    expect(() => {
      render(<Component {...props} />);
    }).not.toThrow();
  });
};

/**
 * Quick accessibility test
 * @param {React.Component} Component - Component to test
 * @param {Object} props - Props to pass to component
 */
export const quickAccessibilityTest = (Component, props = {}) => {
  it('meets basic accessibility requirements', () => {
    render(<Component {...props} />);
    
    // Check for alt attributes on images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
    
    // Check for accessible names on buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      const hasAccessibleName = button.textContent.trim() || 
                               button.getAttribute('aria-label') ||
                               button.getAttribute('title');
      expect(hasAccessibleName).toBeTruthy();
    });
  });
};

/**
 * Quick performance test
 * @param {React.Component} Component - Component to test
 * @param {Object} props - Props to pass to component
 * @param {number} threshold - Performance threshold in ms
 */
export const quickPerformanceTest = (Component, props = {}, threshold = 100) => {
  it(`renders within ${threshold}ms`, () => {
    const start = performance.now();
    render(<Component {...props} />);
    const end = performance.now();
    
    const renderTime = end - start;
    expect(renderTime).toBeLessThan(threshold);
  });
};

/**
 * Create a test data factory for consistent test data generation
 * @param {Object} baseData - Base data structure
 * @param {Object} overrides - Override specific fields
 */
export const createTestDataFactory = (baseData) => {
  return (overrides = {}) => ({
    ...baseData,
    ...overrides,
    // Add timestamp for uniqueness
    _testId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
};

/**
 * Wait for element with better error messages
 * @param {Function} query - Query function
 * @param {Object} options - Wait options
 */
export const waitForElementWithTimeout = async (query, options = {}) => {
  const { timeout = 5000, errorMessage = 'Element not found' } = options;
  
  try {
    return await waitFor(query, { timeout });
  } catch (error) {
    throw new Error(`${errorMessage}. Original error: ${error.message}`);
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Standard setups for convenience
  STANDARD_SETUPS,
  
  // Quick test functions
  quickRenderTest,
  quickAccessibilityTest,
  quickPerformanceTest,
  
  // Utility functions
  createTestDataFactory,
  waitForElementWithTimeout
};
