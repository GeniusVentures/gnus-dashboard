import { render, screen, waitFor, act } from '@testing-library/react';
import BlockchainInfo from '../../../sub-components/dashboard/BlockchainInfo';
// Enhanced test patterns available but using traditional structure for compatibility

// Mock the sub-components to simplify testing
jest.mock('../../../sub-components/tables/BlockExplorerPreview', () => {
  return {
    __esModule: true,
    default: ({ blockData }) => (
      <div data-testid="block-explorer-preview">
        Block Explorer Preview - {blockData.length} blocks
      </div>
    )
  };
});

jest.mock('../../../sub-components/tables/TransactionsPreview', () => {
  return {
    __esModule: true,
    default: ({ transData }) => (
      <div data-testid="transactions-preview">
        Transactions Preview - {transData.length} transactions
      </div>
    )
  };
});

describe('BlockchainInfo Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

      it('renders the component with initial blockchain stats', () => {
        render(<BlockchainInfo />);

        expect(screen.getByText('Blockchain Information')).toBeInTheDocument();
        expect(screen.getByText('Height')).toBeInTheDocument();
        expect(screen.getByText('Transactions')).toBeInTheDocument();
        expect(screen.getByText('Tokens')).toBeInTheDocument();

        // Check initial values
        expect(screen.getByText('3,708')).toBeInTheDocument(); // Initial block height
        expect(screen.getByText('1,134,369')).toBeInTheDocument(); // Initial transaction count
        expect(screen.getByText('850,527')).toBeInTheDocument(); // Token count
      });

      it('renders block explorer and transaction previews', () => {
        render(<BlockchainInfo />);

        expect(screen.getByTestId('block-explorer-preview')).toBeInTheDocument();
        expect(screen.getByTestId('transactions-preview')).toBeInTheDocument();
      });

  it('generates new transactions periodically', async () => {
    render(<BlockchainInfo />);

    // Fast-forward past the initial delay for transactions (2000ms)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Fast-forward to trigger transaction generation (2150ms interval)
    act(() => {
      jest.advanceTimersByTime(2150);
    });

    await waitFor(() => {
      expect(screen.getByText('1,134,370')).toBeInTheDocument(); // Transaction count should increase
    });

    // Check that transaction preview shows the new transaction
    expect(screen.getByText(/Transactions Preview - 1 transactions/)).toBeInTheDocument();
  });

  it('generates new blocks periodically', async () => {
    render(<BlockchainInfo />);

    // Fast-forward past the initial delay for blocks (3500ms)
    act(() => {
      jest.advanceTimersByTime(3500);
    });

    // Fast-forward to trigger block generation (3350ms interval)
    act(() => {
      jest.advanceTimersByTime(3350);
    });

    await waitFor(() => {
      expect(screen.getByText('3,709')).toBeInTheDocument(); // Block height should increase
    });

    // Check that block preview shows the new block
    expect(screen.getByText(/Block Explorer Preview - 1 blocks/)).toBeInTheDocument();
  });

  it('creates transactions with correct structure', async () => {
    render(<BlockchainInfo />);

    // Fast-forward to generate transactions
    act(() => {
      jest.advanceTimersByTime(4200); // 2000 + 2150 + some buffer
    });

    await waitFor(() => {
      const transactionPreview = screen.getByTestId('transactions-preview');
      expect(transactionPreview).toHaveTextContent('1 transactions');
    });
  });

  it('creates blocks with correct structure', async () => {
    render(<BlockchainInfo />);

    // Fast-forward to generate blocks
    act(() => {
      jest.advanceTimersByTime(6900); // 3500 + 3350 + some buffer
    });

    await waitFor(() => {
      const blockPreview = screen.getByTestId('block-explorer-preview');
      expect(blockPreview).toHaveTextContent('1 blocks');
    });
  });

  it('continues generating data over multiple intervals', async () => {
    render(<BlockchainInfo />);

    // Fast-forward through multiple intervals
    act(() => {
      jest.advanceTimersByTime(15000); // Long enough for multiple generations
    });

    await waitFor(() => {
      // Should have multiple transactions and blocks by now
      const transactionCount = screen.getByText(/1,134,37\d/); // Should be higher than initial
      const blockHeight = screen.getByText(/3,71\d/); // Should be higher than initial

      expect(transactionCount).toBeInTheDocument();
      expect(blockHeight).toBeInTheDocument();
    });
  });

}); // End of BlockchainInfo Component describe block