import '@testing-library/jest-dom';

// Enhanced Jest setup for GNUS Dashboard
// This file runs after the test framework has been set up

// Configure testing library
import { configure } from '@testing-library/react';

configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true
});

// Global test utilities
// import { server } from './__tests__/mocks/server'; // Disabled for now - MSW not installed
import { cleanup } from '@testing-library/react';

// Performance optimizations removed for simplicity

// Setup MSW (Mock Service Worker) for API mocking - Disabled for now
// beforeAll(() => {
//   // Start the mock server
//   server.listen({
//     onUnhandledRequest: 'warn'
//   });
// });

afterEach(() => {
  // Reset any request handlers that are declared as a part of our tests
  // server.resetHandlers(); // Disabled for now

  // Clean up DOM after each test
  cleanup();

  // Clear all mocks
  jest.clearAllMocks();

  // Basic cleanup only
});

// afterAll(() => {
//   // Clean up after all tests are done
//   server.close();
// });

// Global mocks for browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock Canvas API for chart testing
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock File and FileReader
global.File = class MockFile {
  constructor(parts, filename, properties) {
    this.parts = parts;
    this.name = filename;
    this.size = parts.reduce((acc, part) => acc + part.length, 0);
    this.type = properties?.type || '';
    this.lastModified = Date.now();
  }
};

global.FileReader = class MockFileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
  }

  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = file.parts.join('');
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = `data:${file.type};base64,${btoa(file.parts.join(''))}`;
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
};

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    }
  }
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test helpers
global.testUtils = {
  // Helper to wait for async operations
  waitFor: (callback, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        try {
          const result = callback();
          if (result) {
            resolve(result);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'));
          } else {
            setTimeout(check, 10);
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error);
          } else {
            setTimeout(check, 10);
          }
        }
      };
      check();
    });
  },

  // Helper to create mock functions with better defaults
  createMockFunction: (name, implementation) => {
    const mock = jest.fn(implementation);
    mock.mockName = name;
    return mock;
  }
};