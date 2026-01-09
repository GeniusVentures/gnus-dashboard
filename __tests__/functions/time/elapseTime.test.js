import elapsedTime from '../../../functions/time/elapseTime';

/**
 * Test Suite: elapsedTime Function
 *
 * Tests the elapsedTime utility function that calculates human-readable
 * time differences between timestamps and the current time.
 */

describe('elapsedTime', () => {
  // Test constants for consistent time calculations
  const FIXED_TIME = '2024-01-15T12:00:00.000Z';
  const FIXED_TIMESTAMP = new Date(FIXED_TIME).getTime();

  // Helper function to create timestamps relative to fixed time
  const createTimestamp = (offsetMs) => {
    return new Date(FIXED_TIMESTAMP + offsetMs).toISOString();
  };

  // Test data for time calculations
  const timeTestCases = [
    { offset: -30000, expected: '30 seconds', description: '30 seconds ago' },
    { offset: -1000, expected: '1 second', description: '1 second ago' },
    { offset: -300000, expected: '5 minutes', description: '5 minutes ago' },
    { offset: -60000, expected: '1 minute', description: '1 minute ago' },
    { offset: -10800000, expected: '3 hours', description: '3 hours ago' },
    { offset: -3600000, expected: '1 hour', description: '1 hour ago' },
    { offset: -172800000, expected: '2 days', description: '2 days ago' },
    { offset: -86400000, expected: '1 day', description: '1 day ago' },
    { offset: 0, expected: '0 seconds', description: 'exactly now' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(FIXED_TIME));

    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Time Calculations', () => {
    // Use parameterized tests for better maintainability
    test.each(timeTestCases)('returns "$expected" for $description', ({ offset, expected }) => {
      const timestamp = createTimestamp(offset);
      const result = elapsedTime(timestamp);
      expect(result).toBe(expected);
    });
  });

  describe('Time Unit Priority', () => {
    it('prioritizes larger time units over smaller ones', () => {
      // 1 day, 2 hours, 30 minutes, 45 seconds ago
      const complexTimestamp = createTimestamp(-90000000); // ~25 hours ago
      const result = elapsedTime(complexTimestamp);

      // Should return days, not hours/minutes/seconds
      expect(result).toMatch(/\d+ day/);
    });

    it('returns the most significant time unit', () => {
      const testCases = [
        { offset: -90000000, expectedUnit: 'day' },    // ~25 hours -> 1 day
        { offset: -7200000, expectedUnit: 'hour' },    // 2 hours
        { offset: -180000, expectedUnit: 'minute' },   // 3 minutes
        { offset: -45000, expectedUnit: 'second' }     // 45 seconds
      ];

      testCases.forEach(({ offset, expectedUnit }) => {
        const timestamp = createTimestamp(offset);
        const result = elapsedTime(timestamp);
        expect(result).toMatch(new RegExp(`\\d+ ${expectedUnit}`));
      });
    });
  });

  describe('Input Validation', () => {
    const invalidInputs = [
      { input: 'invalid-date', description: 'invalid date string' },
      { input: 'not-a-date', description: 'non-date string' },
      { input: '2024-13-45', description: 'invalid date format' },
      { input: undefined, description: 'undefined value' }
    ];

    test.each(invalidInputs)('throws error for $description', ({ input }) => {
      expect(() => elapsedTime(input)).toThrow('Invalid timestamp format');
    });

    it('accepts null and number inputs as valid dates', () => {
      // null and numbers are valid Date constructor inputs
      expect(() => elapsedTime(null)).not.toThrow();
      expect(() => elapsedTime(123)).not.toThrow();
    });

    it('accepts valid ISO timestamp formats', () => {
      const validFormats = [
        '2024-01-15T11:30:00.000Z',
        '2024-01-15T11:30:00Z',
        new Date('2024-01-15T11:30:00.000Z').toISOString()
      ];

      validFormats.forEach(timestamp => {
        expect(() => elapsedTime(timestamp)).not.toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles future timestamps gracefully', () => {
      const futureTimestamp = createTimestamp(3600000); // 1 hour in the future
      const result = elapsedTime(futureTimestamp);

      // Should handle negative time difference gracefully
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles very large time differences', () => {
      const veryOldTimestamp = createTimestamp(-31536000000); // 365 days ago
      const result = elapsedTime(veryOldTimestamp);

      expect(result).toBe('365 days');
    });

    it('handles millisecond precision correctly', () => {
      const timestampWithMs = createTimestamp(-1500); // 1.5 seconds ago
      const result = elapsedTime(timestampWithMs);

      expect(result).toBe('1 second'); // Should round down
    });
  });

  describe('Debug Logging', () => {
    it('logs debug information when called', () => {
      const timestamp = createTimestamp(-90000); // 1.5 minutes ago
      elapsedTime(timestamp);

      expect(console.log).toHaveBeenCalledWith(
        expect.objectContaining({
          secondsPassed: expect.any(Number),
          minutesPassed: expect.any(Number),
          hoursPassed: expect.any(Number),
          daysPassed: expect.any(Number)
        })
      );
    });

    it('logs correct time calculations', () => {
      const timestamp = createTimestamp(-90000); // 90 seconds ago
      elapsedTime(timestamp);

      const logCall = console.log.mock.calls[0][0];
      expect(logCall.secondsPassed).toBe(30); // 90 % 60 = 30
      expect(logCall.minutesPassed).toBe(1);  // floor(90/60) = 1
      expect(logCall.hoursPassed).toBe(0);
      expect(logCall.daysPassed).toBe(0);
    });
  });

  describe('Performance', () => {
    it('executes within reasonable time limits', () => {
      const start = performance.now();

      // Run multiple calculations
      for (let i = 0; i < 100; i++) {
        const timestamp = createTimestamp(-Math.random() * 86400000); // Random time within 24 hours
        elapsedTime(timestamp);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 100 calculations in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
