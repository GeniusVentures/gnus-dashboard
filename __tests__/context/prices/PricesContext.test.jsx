import React from 'react';
import { render, screen } from '@testing-library/react';
import { PricesWrapper, usePricesContext } from '../../../context/prices/PricesContext';

// Mock the usePrices hook
jest.mock('../../../hooks/prices/usePrices', () => ({
  usePrices: () => ({
    price: 1.25,
    percentChange24h: 5.2,
    gasPrice: 25.5,
    error: null,
    updated: '2024-01-01T12:00:00.000Z'
  })
}));

// Create a test component that uses the prices context
const TestComponent = () => {
  const pricesContext = usePricesContext();
  return (
    <div>
      <div data-testid="price">{pricesContext.price}</div>
      <div data-testid="percent-change">{pricesContext.percentChange24h}</div>
      <div data-testid="gas-price">{pricesContext.gasPrice}</div>
      <div data-testid="error">{pricesContext.error || 'no-error'}</div>
      <div data-testid="updated">{pricesContext.updated}</div>
    </div>
  );
};

describe('PricesContext', () => {
  it('provides prices context to child components', () => {
    render(
      <PricesWrapper>
        <TestComponent />
      </PricesWrapper>
    );
    
    expect(screen.getByTestId('price')).toHaveTextContent('1.25');
    expect(screen.getByTestId('percent-change')).toHaveTextContent('5.2');
    expect(screen.getByTestId('gas-price')).toHaveTextContent('25.5');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('updated')).toHaveTextContent('2024-01-01T12:00:00.000Z');
  });

  it('throws error when used outside PricesWrapper', () => {
    // Mock console.error to avoid noise in test output
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('usePricesContext must be used within a PricesWrapper');

    console.error = originalError;
  });
});

// Test component with error state
const TestComponentWithError = () => {
  const pricesContext = usePricesContext();
  return (
    <div>
      <div data-testid="error-state">{pricesContext.error || 'no-error'}</div>
    </div>
  );
};

describe('PricesContext with error state', () => {
  it('handles error state correctly', () => {
    // Mock usePrices to return error state for this test
    const mockUsePricesError = jest.fn(() => ({
      price: null,
      percentChange24h: null,
      gasPrice: null,
      error: 'Failed to fetch prices',
      updated: null
    }));

    // Temporarily replace the mock
    const originalMock = require('../../../hooks/prices/usePrices').usePrices;
    require('../../../hooks/prices/usePrices').usePrices = mockUsePricesError;

    render(
      <PricesWrapper>
        <TestComponentWithError />
      </PricesWrapper>
    );

    expect(screen.getByTestId('error-state')).toHaveTextContent('Failed to fetch prices');

    // Restore original mock
    require('../../../hooks/prices/usePrices').usePrices = originalMock;
  });
});
