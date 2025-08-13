import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import Landing from '../../pages/index';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

// Mock the lastUpdate function
jest.mock('../../functions/time/lastUpdate', () => ({
  __esModule: true,
  default: () => 'January 15, 2024 at 10:30:45 AM UTC'
}));

// Mock the BlockchainInfo component
jest.mock('../../sub-components/dashboard/BlockchainInfo', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="blockchain-info">Blockchain Info Component</div>
  };
});

// Mock the StaticVideoBG component
jest.mock('../../sub-components/videos/StaticVideoBG', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="static-video-bg">Static Video Background</div>
  };
});

// Mock window.innerWidth
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1200,
});

// Mock window resize event
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener,
});
Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener,
});

describe('Landing Page', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({
      push: mockPush,
      pathname: '/',
      query: {},
      asPath: '/'
    });
    window.innerWidth = 1200;
  });

  it('renders the landing page with correct title', () => {
    render(<Landing />);
    
    expect(screen.getByText('Testnet Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();
  });

  it('renders blockchain info component', () => {
    render(<Landing />);
    
    expect(screen.getByTestId('blockchain-info')).toBeInTheDocument();
  });

  it('renders view analytics button', () => {
    render(<Landing />);
    
    const analyticsButton = screen.getByText('View Analytics');
    expect(analyticsButton).toBeInTheDocument();
  });

  it('navigates to analytics page when button is clicked', () => {
    render(<Landing />);
    
    const analyticsButton = screen.getByText('View Analytics');
    fireEvent.click(analyticsButton);
    
    expect(mockPush).toHaveBeenCalledWith('/analytics');
  });

  it('adjusts layout for different screen sizes', () => {
    const testCases = [
      { width: 1200, expectedClass: 'display-3', description: 'large screens (>= 1200px)' },
      { width: 1000, expectedClass: 'display-4', description: 'medium screens (900-1199px)' },
      { width: 800, expectedClass: 'display-5', description: 'small screens (< 900px)' }
    ];

    testCases.forEach(({ width, expectedClass, description }) => {
      window.innerWidth = width;
      const { unmount } = render(<Landing />);

      const title = screen.getByText('Testnet Dashboard');
      expect(title).toHaveClass(expectedClass);

      unmount(); // Clean up between test cases
    });
  });

  it('sets up window resize listener', () => {
    render(<Landing />);
    
    expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('cleans up resize listener on unmount', () => {
    const { unmount } = render(<Landing />);
    
    unmount();
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('updates width state on window resize', async () => {
    render(<Landing />);
    
    // Get the resize handler
    const resizeHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'resize'
    )[1];
    
    // Change window width and trigger resize
    window.innerWidth = 800;
    resizeHandler();
    
    await waitFor(() => {
      const title = screen.getByText('Testnet Dashboard');
      expect(title).toHaveClass('display-5');
    });
  });

  it('has correct styling and layout', () => {
    render(<Landing />);

    const mainContainer = screen.getByText('Testnet Dashboard').closest('div');
    // Check for actual classes that are applied
    expect(mainContainer).toHaveClass('text-center', 'mt-5');
  });

  it('displays last updated time correctly', () => {
    render(<Landing />);
    
    expect(screen.getByText('Last updated: January 15, 2024 at 10:30:45 AM UTC')).toBeInTheDocument();
  });

  it('handles missing last update gracefully', () => {
    // Mock lastUpdate to return null
    jest.doMock('../../functions/time/lastUpdate', () => ({
      __esModule: true,
      default: () => null
    }));
    
    render(<Landing />);
    
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });
});
