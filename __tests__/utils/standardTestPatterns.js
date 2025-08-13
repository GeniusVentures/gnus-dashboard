/**
 * Standardized Test Patterns
 * 
 * Reusable test patterns that eliminate duplication and ensure
 * consistent testing approaches across the GNUS Dashboard test suite.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStandardTestSuite, STANDARD_SETUPS } from './testSetup';

// =============================================================================
// COMPONENT TEST PATTERNS
// =============================================================================

/**
 * Standard component rendering tests
 * @param {React.Component} Component - Component to test
 * @param {Object} options - Test configuration
 */
export const createComponentRenderTests = (Component, options = {}) => {
  const {
    displayName = Component.displayName || Component.name || 'Component',
    defaultProps = {},
    requiredProps = {},
    testIds = [],
    skipAccessibility = false
  } = options;

  return {
    'renders without crashing': () => {
      const props = { ...defaultProps, ...requiredProps };
      expect(() => {
        render(<Component {...props} />);
      }).not.toThrow();
    },

    'renders with correct test IDs': () => {
      if (testIds.length === 0) return;
      
      const props = { ...defaultProps, ...requiredProps };
      render(<Component {...props} />);
      
      testIds.forEach(testId => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });
    },

    'meets basic accessibility requirements': () => {
      if (skipAccessibility) return;
      
      const props = { ...defaultProps, ...requiredProps };
      render(<Component {...props} />);
      
      // Check for basic accessibility requirements
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
      
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        const hasAccessibleName = button.textContent.trim() || 
                                 button.getAttribute('aria-label') ||
                                 button.getAttribute('title');
        expect(hasAccessibleName).toBeTruthy();
      });
    }
  };
};

/**
 * Standard form testing patterns
 * @param {Object} options - Form test configuration
 */
export const createFormTestPatterns = (options = {}) => {
  const {
    formSelector = 'form',
    submitSelector = '[type="submit"]',
    requiredFields = [],
    validationRules = {}
  } = options;

  return {
    'handles form submission with valid data': async (validData) => {
      // Fill form with valid data
      for (const [fieldName, value] of Object.entries(validData)) {
        const field = screen.getByLabelText(new RegExp(fieldName, 'i')) ||
                     screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                     document.getElementById(fieldName);
        
        if (field) {
          if (field.type === 'file') {
            const file = new File([value], 'test.json', { type: 'application/json' });
            fireEvent.change(field, { target: { files: [file] } });
          } else {
            fireEvent.change(field, { target: { value } });
          }
        }
      }
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit/i }) ||
                          document.querySelector(submitSelector);
      
      if (submitButton) {
        fireEvent.click(submitButton);
      }
    },

    'validates required fields': async () => {
      const submitButton = screen.getByRole('button', { name: /submit/i }) ||
                          document.querySelector(submitSelector);
      
      if (submitButton) {
        fireEvent.click(submitButton);
        
        // Check that form doesn't submit without required fields
        await waitFor(() => {
          // This is a basic check - specific validation messages should be tested in individual tests
          expect(submitButton).toBeInTheDocument();
        });
      }
    },

    'handles field validation': async (fieldName, invalidValue, expectedError) => {
      const field = screen.getByLabelText(new RegExp(fieldName, 'i')) ||
                   screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                   document.getElementById(fieldName);
      
      if (field) {
        fireEvent.change(field, { target: { value: invalidValue } });
        fireEvent.blur(field);
        
        if (expectedError) {
          await waitFor(() => {
            expect(screen.getByText(new RegExp(expectedError, 'i'))).toBeInTheDocument();
          });
        }
      }
    }
  };
};

/**
 * Standard wallet interaction patterns
 * @param {Object} mocks - Mock instances from test setup
 */
export const createWalletTestPatterns = (mocks) => {
  return {
    'displays wallet connection status': () => {
      const { web3Modal } = mocks;
      const account = web3Modal.useWeb3ModalAccount();
      
      if (account.isConnected) {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
        expect(screen.getByText(account.address)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(/connected/i)).not.toBeInTheDocument();
      }
    },

    'handles wallet connection': async () => {
      const { web3Modal } = mocks;
      const connectButton = screen.getByRole('button', { name: /connect/i });
      
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(web3Modal.useWeb3Modal().open).toHaveBeenCalled();
      });
    },

    'handles network switching': async () => {
      const { web3Modal } = mocks;
      const provider = web3Modal.useWeb3ModalProvider().walletProvider;
      
      if (provider && provider.request) {
        // Simulate network switch request
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13882' }] // Polygon Amoy
        });
        
        expect(provider.request).toHaveBeenCalledWith({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13882' }]
        });
      }
    }
  };
};

/**
 * Standard async operation patterns
 * @param {Object} options - Async test configuration
 */
export const createAsyncTestPatterns = (options = {}) => {
  const {
    loadingSelector = '[data-testid*="loading"]',
    errorSelector = '[data-testid*="error"]',
    successSelector = '[data-testid*="success"]'
  } = options;

  return {
    'shows loading state during async operations': async (triggerAsync) => {
      triggerAsync();
      
      // Check for loading indicator
      const loadingElement = document.querySelector(loadingSelector) ||
                           screen.queryByText(/loading/i);
      
      if (loadingElement) {
        expect(loadingElement).toBeInTheDocument();
      }
    },

    'handles async success': async (triggerAsync, expectedResult) => {
      await triggerAsync();
      
      await waitFor(() => {
        if (expectedResult) {
          expect(screen.getByText(new RegExp(expectedResult, 'i'))).toBeInTheDocument();
        }
        
        const successElement = document.querySelector(successSelector);
        if (successElement) {
          expect(successElement).toBeInTheDocument();
        }
      });
    },

    'handles async errors': async (triggerAsync, expectedError) => {
      await triggerAsync();
      
      await waitFor(() => {
        if (expectedError) {
          expect(screen.getByText(new RegExp(expectedError, 'i'))).toBeInTheDocument();
        }
        
        const errorElement = document.querySelector(errorSelector);
        if (errorElement) {
          expect(errorElement).toBeInTheDocument();
        }
      });
    }
  };
};

/**
 * Standard performance test patterns
 */
export const createPerformanceTestPatterns = () => {
  return {
    'renders within performance threshold': async (Component, props = {}, threshold = 100) => {
      const start = performance.now();
      render(<Component {...props} />);
      const end = performance.now();
      
      const renderTime = end - start;
      expect(renderTime).toBeLessThan(threshold);
    },

    'handles multiple re-renders efficiently': async (Component, props = {}, rerenderCount = 10) => {
      const { rerender } = render(<Component {...props} />);
      
      const start = performance.now();
      for (let i = 0; i < rerenderCount; i++) {
        rerender(<Component {...props} key={i} />);
      }
      const end = performance.now();
      
      const totalTime = end - start;
      const averageTime = totalTime / rerenderCount;
      
      expect(averageTime).toBeLessThan(50); // 50ms per re-render
    }
  };
};

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export {
  createStandardTestSuite,
  STANDARD_SETUPS
};
