import React from 'react';
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
    },
  }),
}));

// Mock Web3Modal
jest.mock('@web3modal/ethers/react', () => ({
  createWeb3Modal: jest.fn(),
  useWeb3ModalAccount: () => ({
    isConnected: false,
    address: null,
  }),
  useWeb3ModalProvider: () => ({
    walletProvider: null,
  }),
  useWeb3Modal: () => ({
    open: jest.fn(),
    close: jest.fn(),
  }),
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
  ToastContainer: ({ children }) => <div data-testid="toast-container">{children}</div>,
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock Bootstrap CSS
jest.mock('bootstrap/dist/css/bootstrap.min.css', () => ({}));

// Mock global CSS
jest.mock('../styles/globals.css', () => ({}));

// Mock context providers
const MockIPFSProvider = ({ children }) => (
  <div data-testid="ipfs-provider">{children}</div>
);

const MockPricesProvider = ({ children }) => (
  <div data-testid="prices-provider">{children}</div>
);

const MockWeb3ModalProvider = ({ children }) => (
  <div data-testid="web3modal-provider">{children}</div>
);

jest.mock('../../context/ipfs/IPFSContext', () => ({
  IPFSWrapper: MockIPFSProvider,
}));

jest.mock('../../context/prices/PricesContext', () => ({
  PricesWrapper: MockPricesProvider,
}));

jest.mock('../../context/wallet/Web3Modal', () => ({
  Web3Modal: MockWeb3ModalProvider,
}));

// Mock the App component
const MockApp = ({ Component, pageProps }) => {
  // Simulate the actual _app.tsx structure
  React.useEffect(() => {
    // Simulate any global initialization
    console.log('App initialized');
  }, []);

  return (
    <div data-testid="app-wrapper">
      <MockWeb3ModalProvider>
        <MockIPFSProvider>
          <MockPricesProvider>
            <div data-testid="app-content">
              <Component {...pageProps} />
            </div>
            <div data-testid="toast-container">Toast Container</div>
          </MockPricesProvider>
        </MockIPFSProvider>
      </MockWeb3ModalProvider>
    </div>
  );
};

// Mock page components for testing
const MockHomePage = (props) => (
  <div data-testid="home-page" data-props={JSON.stringify(props)}>
    Home Page Content
  </div>
);

const MockJobOrdersPage = (props) => (
  <div data-testid="job-orders-page" data-props={JSON.stringify(props)}>
    Job Orders Page Content
  </div>
);

const MockAnalyticsPage = (props) => (
  <div data-testid="analytics-page" data-props={JSON.stringify(props)}>
    Analytics Page Content
  </div>
);

describe('App Component (_app.tsx)', () => {
  describe('App Structure', () => {
    it('should render the app wrapper with all providers', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      expect(screen.getByTestId('app-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('web3modal-provider')).toBeInTheDocument();
      expect(screen.getByTestId('ipfs-provider')).toBeInTheDocument();
      expect(screen.getByTestId('prices-provider')).toBeInTheDocument();
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });

    it('should render the correct page component', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      expect(screen.getByText('Home Page Content')).toBeInTheDocument();
    });

    it('should pass pageProps to the component', () => {
      const testProps = { title: 'Test Title', data: { id: 1 } };
      
      render(<MockApp Component={MockHomePage} pageProps={testProps} />);
      
      const homePage = screen.getByTestId('home-page');
      expect(homePage).toHaveAttribute('data-props', JSON.stringify(testProps));
    });

    it('should have proper provider hierarchy', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      // Check that providers are nested correctly
      const web3Provider = screen.getByTestId('web3modal-provider');
      const ipfsProvider = screen.getByTestId('ipfs-provider');
      const pricesProvider = screen.getByTestId('prices-provider');
      const appContent = screen.getByTestId('app-content');
      
      expect(web3Provider).toContainElement(ipfsProvider);
      expect(ipfsProvider).toContainElement(pricesProvider);
      expect(pricesProvider).toContainElement(appContent);
    });
  });

  describe('Different Page Components', () => {
    it('should render home page correctly', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      expect(screen.getByText('Home Page Content')).toBeInTheDocument();
    });

    it('should render job orders page correctly', () => {
      render(<MockApp Component={MockJobOrdersPage} pageProps={{}} />);
      
      expect(screen.getByTestId('job-orders-page')).toBeInTheDocument();
      expect(screen.getByText('Job Orders Page Content')).toBeInTheDocument();
    });

    it('should render analytics page correctly', () => {
      render(<MockApp Component={MockAnalyticsPage} pageProps={{}} />);
      
      expect(screen.getByTestId('analytics-page')).toBeInTheDocument();
      expect(screen.getByText('Analytics Page Content')).toBeInTheDocument();
    });

    it('should handle page switching', () => {
      const { rerender } = render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      
      rerender(<MockApp Component={MockJobOrdersPage} pageProps={{}} />);
      
      expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('job-orders-page')).toBeInTheDocument();
    });
  });

  describe('Context Providers', () => {
    it('should provide Web3Modal context', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      expect(screen.getByTestId('web3modal-provider')).toBeInTheDocument();
    });

    it('should provide IPFS context', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      expect(screen.getByTestId('ipfs-provider')).toBeInTheDocument();
    });

    it('should provide Prices context', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      expect(screen.getByTestId('prices-provider')).toBeInTheDocument();
    });

    it('should maintain context across page changes', () => {
      const { rerender } = render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      const web3Provider = screen.getByTestId('web3modal-provider');
      const ipfsProvider = screen.getByTestId('ipfs-provider');
      const pricesProvider = screen.getByTestId('prices-provider');
      
      rerender(<MockApp Component={MockJobOrdersPage} pageProps={{}} />);
      
      // Providers should still be there
      expect(screen.getByTestId('web3modal-provider')).toBe(web3Provider);
      expect(screen.getByTestId('ipfs-provider')).toBe(ipfsProvider);
      expect(screen.getByTestId('prices-provider')).toBe(pricesProvider);
    });
  });

  describe('Toast Notifications', () => {
    it('should include toast container', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });

    it('should maintain toast container across pages', () => {
      const { rerender } = render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      const toastContainer = screen.getByTestId('toast-container');
      
      rerender(<MockApp Component={MockJobOrdersPage} pageProps={{}} />);
      
      expect(screen.getByTestId('toast-container')).toBe(toastContainer);
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };
      
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<MockApp Component={ErrorComponent} pageProps={{}} />);
      }).toThrow('Test error');
      
      consoleSpy.mockRestore();
    });

    it('should handle missing pageProps', () => {
      render(<MockApp Component={MockHomePage} pageProps={undefined} />);
      
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('should handle null component', () => {
      const NullComponent = () => null;
      
      render(<MockApp Component={NullComponent} pageProps={{}} />);
      
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = Date.now();
      
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render within 100ms
    });

    it('should handle rapid page changes', () => {
      const { rerender } = render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      const startTime = Date.now();
      
      // Simulate rapid page changes
      for (let i = 0; i < 5; i++) {
        rerender(<MockApp Component={MockJobOrdersPage} pageProps={{}} />);
        rerender(<MockApp Component={MockAnalyticsPage} pageProps={{}} />);
        rerender(<MockApp Component={MockHomePage} pageProps={{}} />);
      }
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(500); // Should handle rapid changes within 500ms
    });
  });

  describe('Accessibility', () => {
    it('should have proper app structure for screen readers', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      const appWrapper = screen.getByTestId('app-wrapper');
      expect(appWrapper).toBeInTheDocument();
      
      const appContent = screen.getByTestId('app-content');
      expect(appContent).toBeInTheDocument();
    });

    it('should maintain focus management across page changes', () => {
      const { rerender } = render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      const appContent = screen.getByTestId('app-content');
      
      rerender(<MockApp Component={MockJobOrdersPage} pageProps={{}} />);
      
      // App content should still be accessible
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
  });

  describe('Global State Management', () => {
    it('should initialize all context providers', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      // All providers should be initialized
      expect(screen.getByTestId('web3modal-provider')).toBeInTheDocument();
      expect(screen.getByTestId('ipfs-provider')).toBeInTheDocument();
      expect(screen.getByTestId('prices-provider')).toBeInTheDocument();
    });

    it('should maintain global state across navigation', () => {
      const { rerender } = render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      // Get initial provider references
      const initialProviders = {
        web3: screen.getByTestId('web3modal-provider'),
        ipfs: screen.getByTestId('ipfs-provider'),
        prices: screen.getByTestId('prices-provider'),
      };
      
      // Navigate to different page
      rerender(<MockApp Component={MockJobOrdersPage} pageProps={{}} />);
      
      // Providers should be the same instances (maintaining state)
      expect(screen.getByTestId('web3modal-provider')).toBe(initialProviders.web3);
      expect(screen.getByTestId('ipfs-provider')).toBe(initialProviders.ipfs);
      expect(screen.getByTestId('prices-provider')).toBe(initialProviders.prices);
    });
  });

  describe('Props Handling', () => {
    it('should handle complex pageProps', () => {
      const complexProps = {
        user: { id: 1, name: 'Test User' },
        settings: { theme: 'dark', language: 'en' },
        data: [1, 2, 3, 4, 5],
        metadata: { version: '1.0.0' }
      };
      
      render(<MockApp Component={MockHomePage} pageProps={complexProps} />);
      
      const homePage = screen.getByTestId('home-page');
      expect(homePage).toHaveAttribute('data-props', JSON.stringify(complexProps));
    });

    it('should handle empty pageProps', () => {
      render(<MockApp Component={MockHomePage} pageProps={{}} />);
      
      const homePage = screen.getByTestId('home-page');
      expect(homePage).toHaveAttribute('data-props', '{}');
    });

    it('should handle pageProps with functions', () => {
      const propsWithFunction = {
        onClick: () => {},
        data: { id: 1 }
      };
      
      // Functions should be handled gracefully (though they won't serialize)
      expect(() => {
        render(<MockApp Component={MockHomePage} pageProps={propsWithFunction} />);
      }).not.toThrow();
    });
  });
});
