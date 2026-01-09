/**
 * Next.js Router Mock
 * 
 * Centralized mock for next/router to avoid duplication across test files.
 * Provides configurable mock implementations for different routing scenarios.
 */

// Default router state
const defaultRouterState = {
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  basePath: '',
  locale: undefined,
  locales: undefined,
  defaultLocale: undefined,
  isReady: true,
  isPreview: false,
  isFallback: false
};

// Create mock router with configurable state
const createMockRouter = (overrides = {}) => {
  const router = {
    ...defaultRouterState,
    ...overrides,
    
    // Navigation methods
    push: jest.fn().mockResolvedValue(true),
    replace: jest.fn().mockResolvedValue(true),
    reload: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    
    // Prefetch method
    prefetch: jest.fn().mockResolvedValue(undefined),
    
    // Event methods
    beforePopState: jest.fn(),
    
    // Events object
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    }
  };

  return router;
};

// Pre-configured router scenarios
export const routerScenarios = {
  // Home page
  home: () => createMockRouter({
    pathname: '/',
    route: '/',
    asPath: '/'
  }),

  // Job orders page
  jobOrders: () => createMockRouter({
    pathname: '/job-orders',
    route: '/job-orders',
    asPath: '/job-orders'
  }),

  // Analytics page
  analytics: () => createMockRouter({
    pathname: '/analytics',
    route: '/analytics',
    asPath: '/analytics'
  }),

  // Dynamic route with ID
  dynamicRoute: (id = '123') => createMockRouter({
    pathname: '/job-orders/[id]',
    route: '/job-orders/[id]',
    query: { id },
    asPath: `/job-orders/${id}`
  }),

  // Route with query parameters
  withQuery: (query = { tab: 'overview' }) => createMockRouter({
    pathname: '/',
    route: '/',
    query,
    asPath: `/?${new URLSearchParams(query).toString()}`
  }),

  // Loading state (not ready)
  loading: () => createMockRouter({
    isReady: false,
    isFallback: true
  }),

  // Preview mode
  preview: () => createMockRouter({
    isPreview: true,
    query: { preview: 'true' }
  }),

  // With locale
  withLocale: (locale = 'en', locales = ['en', 'es', 'fr']) => createMockRouter({
    locale,
    locales,
    defaultLocale: 'en'
  }),

  // Navigation error scenario
  navigationError: () => {
    const router = createMockRouter();
    router.push.mockRejectedValue(new Error('Navigation failed'));
    router.replace.mockRejectedValue(new Error('Navigation failed'));
    return router;
  },

  // Slow navigation scenario
  slowNavigation: (delay = 2000) => {
    const router = createMockRouter();
    router.push.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(true), delay))
    );
    router.replace.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(true), delay))
    );
    return router;
  }
};

// Mock useRouter hook
const createMockUseRouter = (routerState = defaultRouterState) => {
  return jest.fn(() => createMockRouter(routerState));
};

// Default mock module
const defaultMock = {
  useRouter: createMockUseRouter(),
  withRouter: jest.fn((Component) => Component),
  Router: {
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn()
  }
};

// Export default mock
export default defaultMock;

// Named exports for specific scenarios
export const {
  home,
  jobOrders,
  analytics,
  dynamicRoute,
  withQuery,
  loading,
  preview,
  withLocale,
  navigationError,
  slowNavigation
} = routerScenarios;

// Utility functions for tests
export const routerTestUtils = {
  // Set up mock for a specific test
  setupMock: (scenario) => {
    const router = typeof scenario === 'function' ? scenario() : scenario;
    const mockUseRouter = jest.fn(() => router);
    
    jest.doMock('next/router', () => ({
      useRouter: mockUseRouter,
      withRouter: jest.fn((Component) => Component),
      Router: router
    }));
    
    return { router, mockUseRouter };
  },

  // Reset mock to default state
  resetMock: () => {
    jest.doMock('next/router', () => defaultMock);
  },

  // Create custom router mock
  createCustomRouter: (overrides) => {
    return createMockRouter(overrides);
  },

  // Simulate route change
  simulateRouteChange: (mockRouter, newRoute) => {
    const { pathname, query = {}, asPath } = newRoute;
    
    // Update router state
    Object.assign(mockRouter, {
      pathname,
      route: pathname,
      query,
      asPath: asPath || pathname
    });

    // Emit route change events
    mockRouter.events.emit('routeChangeStart', asPath || pathname);
    mockRouter.events.emit('routeChangeComplete', asPath || pathname);
  },

  // Simulate route change error
  simulateRouteChangeError: (mockRouter, error, url) => {
    mockRouter.events.emit('routeChangeError', error, url);
  },

  // Simulate before unload
  simulateBeforeUnload: (mockRouter, url) => {
    mockRouter.events.emit('beforeHistoryChange', url);
  },

  // Get navigation history from mock calls
  getNavigationHistory: (mockRouter) => {
    return {
      pushCalls: mockRouter.push.mock.calls,
      replaceCalls: mockRouter.replace.mock.calls,
      reloadCalls: mockRouter.reload.mock.calls,
      backCalls: mockRouter.back.mock.calls,
      forwardCalls: mockRouter.forward.mock.calls
    };
  },

  // Assert navigation occurred
  assertNavigation: (mockRouter, method, expectedUrl, expectedOptions = {}) => {
    expect(mockRouter[method]).toHaveBeenCalledWith(expectedUrl, expectedOptions);
  },

  // Wait for navigation to complete
  waitForNavigation: async (mockRouter, method = 'push') => {
    const lastCall = mockRouter[method].mock.results[mockRouter[method].mock.results.length - 1];
    if (lastCall && lastCall.type === 'return' && lastCall.value instanceof Promise) {
      await lastCall.value;
    }
  }
};
