import jwt from 'jsonwebtoken';

// Mock JWT for testing
export const createMockJWT = (payload = { id: 'test-user', address: '0x123', role: 'user' }) => {
  const secret = 'test-secret';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
};

// Mock environment variables for tests
export const mockAuthEnv = () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.BLASTAPI_KEY = 'test-api-key';
  process.env.WALLETCONNECT_PROJECT_ID = 'test-project-id';
  process.env.ETH_PRIVATE_KEY = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
};

// Create authenticated request headers
export const createAuthHeaders = (token) => ({
  'authorization': `Bearer ${token}`,
  'content-type': 'application/json'
});

// Mock request with proper structure for middleware
export const createMockRequest = (overrides = {}) => ({
  method: 'POST',
  headers: {},
  body: {},
  url: '/test',
  socket: { remoteAddress: '127.0.0.1' },
  connection: { remoteAddress: '127.0.0.1' },
  ...overrides
});

// Mock response with proper structure
export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    statusCode: 200,
    headers: {}
  };
  return res;
};