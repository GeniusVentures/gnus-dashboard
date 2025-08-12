# 🧪 GNUS Dashboard Test Suite

A streamlined, essential testing framework for the GNUS Dashboard application focusing on critical functionality and maintainability.

## 📊 Test Results Summary

**✅ All Tests Passing:**
- **Unit Tests**: 8 suites, 51 tests
- **Integration Tests**: 8 suites, 77 tests  
- **E2E Tests**: 2 suites, 9 tests
- **Total**: 18 test suites, 137 tests

## 📁 Streamlined Directory Structure

```
__tests__/
├── README.md                    # This documentation
├── basic.test.js               # Jest configuration verification
├── utils/                      # Essential test utilities
│   ├── index.js                # Main utilities export
│   ├── testSetup.js            # Test environment setup
│   ├── standardTestPatterns.js # Modern test patterns
│   ├── testHelpers.js          # Simplified test creation
│   ├── mockFactory.js          # Centralized mock factory
│   ├── testData.js             # Test data generators
│   └── jest.polyfills.js       # Jest polyfills
├── mocks/                      # Centralized mocks
│   ├── web3Modal.js            # Web3Modal mock
│   ├── nextRouter.js           # Next.js router mock
│   ├── reactToastify.js        # Toast notifications mock
│   └── fileMock.js             # File mock for assets
├── components/                 # Essential component tests
│   ├── dashboard/
│   │   └── BlockchainInfo.test.jsx    # Blockchain data display
│   ├── job-order/
│   │   └── OrderForm.test.jsx         # Core job submission form
│   └── navbar/
│       └── Price.test.jsx             # Price display component
├── context/                    # Context provider tests
│   ├── ipfs/
│   │   └── IPFSContext.test.jsx       # IPFS functionality
│   └── prices/
│       └── PricesContext.test.jsx     # Price data management
├── functions/                  # Core utility functions
│   ├── ipfs/
│   │   └── node.test.js               # IPFS node operations
│   ├── messages/
│   │   └── processing.test.js         # Message processing
│   └── time/
│       └── elapseTime.test.js         # Time calculations
├── hooks/                      # Custom React hooks
│   ├── ipfs/
│   │   └── useIPFS.test.js            # IPFS hook
│   └── prices/
│       └── usePrices.test.js          # Price data hook
├── pages/                      # Page component tests
│   ├── api/                    # API endpoint tests
│   │   ├── gas/
│   │   │   └── gasPrice.test.js       # Gas price API
│   │   └── processing/
│   │       ├── getEstimate.test.js    # Cost estimation
│   │       └── submitJob.test.js      # Job submission
│   ├── _app.test.tsx           # App initialization
│   └── index.test.jsx          # Home page
└── e2e/                        # End-to-end tests
    ├── 00-basic-smoke.test.js  # Basic functionality
    └── 03-job-order-flow.test.js # Job order workflow
```

## 🎯 Essential Tests Overview

### **Unit Tests (51 tests)**
Core business logic and utility functions:

1. **IPFS Functions** - File storage and retrieval operations
2. **Time Functions** - Date/time calculations and formatting
3. **Message Processing** - Core message handling logic
4. **Price Hooks** - Price data fetching and management
5. **IPFS Hooks** - IPFS integration functionality
6. **Context Providers** - State management for prices and IPFS

### **Integration Tests (77 tests)**
Component integration and API endpoints:

1. **OrderForm Component** - Job submission form with wallet integration
2. **Price Component** - Real-time price display with context
3. **BlockchainInfo Component** - Blockchain data visualization
4. **API Endpoints** - Cost estimation and job submission APIs
5. **Page Components** - App initialization and home page
6. **Gas Price API** - Network gas price fetching

### **E2E Tests (9 tests)**
Critical user workflows:

1. **Basic Smoke Tests** - Application loading and basic functionality
2. **Job Order Flow** - Complete job submission workflow

## 🚀 Running Tests

### **Individual Test Types**
```bash
# Run unit tests only
npm run test:unit

# Run integration tests only  
npm run test:integration

# Run E2E tests only
npm run test:e2e
```

### **All Tests**
```bash
# Run all tests
npm test
```

### **Development Mode**
```bash
# Watch mode for development
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🛠️ Test Utilities

### **Centralized Mocks**
All common dependencies are mocked centrally:

```javascript
// Automatic mock setup for common dependencies
jest.mock('@web3modal/ethers/react', () => require('../mocks/web3Modal'));
jest.mock('react-toastify', () => require('../mocks/reactToastify'));
jest.mock('next/router', () => require('../mocks/nextRouter'));
```

### **Test Patterns**
Standardized patterns for consistent testing:

```javascript
import { createStandardTestSuite } from '../utils/standardTestPatterns';

createStandardTestSuite('Component Name', {
  setupType: 'componentTesting'
}, (mocks) => {
  // Test implementation
});
```

### **Mock Factory**
Quick setup for common scenarios:

```javascript
import { QUICK_SETUPS } from '../utils/mockFactory';

QUICK_SETUPS.connectedWallet('Wallet Tests', (mocks) => {
  // Tests with connected wallet
});
```

## 📝 Writing New Tests

### **Component Tests**
```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### **API Tests**
```javascript
import handler from '../pages/api/myEndpoint';
import { createMocks } from 'node-mocks-http';

describe('/api/myEndpoint', () => {
  it('handles requests correctly', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
});
```

### **Hook Tests**
```javascript
import { renderHook } from '@testing-library/react';
import { useMyHook } from '../hooks/useMyHook';

describe('useMyHook', () => {
  it('returns expected values', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBeDefined();
  });
});
```

## 🔧 Configuration

### **Jest Configuration**
Located in `jest.config.js` with optimized settings:
- Module path mapping for clean imports
- Setup files for test environment
- Coverage thresholds for quality assurance
- Transform settings for TypeScript and JSX

### **Test Environment**
Setup in `jest.setup.js`:
- Global test utilities
- Mock configurations
- Polyfills for browser APIs
- Cleanup between tests

## 📊 Coverage Requirements

Minimum coverage thresholds:
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### **Common Issues**
1. **Mock not working**: Check if mock is properly imported
2. **Async test failing**: Use `waitFor` for async operations
3. **Component not rendering**: Verify required props and context
4. **API test failing**: Check request/response mocking

### **Debug Commands**
```bash
# Run specific test file
npm test -- OrderForm.test.jsx

# Run tests in verbose mode
npm test -- --verbose

# Run tests with debugging
npm test -- --detectOpenHandles
```


