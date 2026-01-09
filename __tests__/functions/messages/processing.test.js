import processingMsg from '../../../functions/messages/processing';
import { updateTD, transactionData } from '../../../data/prepared/transactionInfo';

// Mock the dependencies
jest.mock('../../../data/prepared/transactionInfo', () => ({
  transactionData: [],
  updateTD: jest.fn()
}));

describe('processingMsg', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process processing message and update transaction data', () => {
    // Mock processing data
    const mockProcessing = {
      dagStruct: {
        dataHash: [116, 101, 115, 116, 72, 97, 115, 104], // 'testHash' in ASCII
        timestamp: '1234567890'
      }
    };

    // Call the function
    processingMsg(mockProcessing);

    // Check if updateTD was called with the correct data
    expect(updateTD).toHaveBeenCalled();
    const updateCall = updateTD.mock.calls[0][0];
    
    // Verify the first item in the array is our new transaction
    expect(updateCall[0]).toEqual({
      txHash: 'testHash',
      type: 'Processing',
      value: null,
      time: '1234567890'
    });
  });

  it('should handle errors gracefully', () => {
    // Mock console.log to check error handling
    console.log = jest.fn();
    
    // Call with invalid data
    processingMsg(null);
    
    // Verify error was logged
    expect(console.log).toHaveBeenCalled();
  });
});