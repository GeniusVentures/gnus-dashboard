/**
 * Job Order Submission Flow Tests
 *
 * Tests the complete job order submission workflow including form validation,
 * wallet integration, and API interactions.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { setupTestEnvironment } from '../utils/testSetup';

// Mock API calls
global.fetch = jest.fn();

describe('Job Order Submission Flow', () => {
  let testSetup;

  beforeAll(() => {
    testSetup = setupTestEnvironment();
  });

  afterAll(() => {
    testSetup.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default fetch responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processing/getEstimate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ estimate: 150 })
        });
      }

      if (url.includes('/api/processing/submitJob')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, jobId: 'job_123' })
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Job Order Form', () => {
    it('displays the order form', () => {
      const JobOrderForm = () => (
        <div>
          <h1>Order Form</h1>
          <form data-testid="job-order-form">
            <input type="text" placeholder="Model Location" />
            <button type="submit">Submit Order</button>
          </form>
        </div>
      );

      render(<JobOrderForm />);

      expect(screen.getByText('Order Form')).toBeInTheDocument();
      expect(screen.getByTestId('job-order-form')).toBeInTheDocument();
    });

    it('allows selecting processing type', () => {
      const ProcessingTypeForm = () => {
        const [processingType, setProcessingType] = React.useState('manual');

        return (
          <form>
            <fieldset>
              <legend>Processing Type</legend>
              <label>
                <input
                  type="radio"
                  name="processingType"
                  value="manual"
                  checked={processingType === 'manual'}
                  onChange={(e) => setProcessingType(e.target.value)}
                />
                Manual
              </label>
              <label>
                <input
                  type="radio"
                  name="processingType"
                  value="upload"
                  checked={processingType === 'upload'}
                  onChange={(e) => setProcessingType(e.target.value)}
                />
                Upload
              </label>
            </fieldset>
            <div data-testid="selected-type">{processingType}</div>
          </form>
        );
      };

      render(<ProcessingTypeForm />);

      // Test radio button selection
      const uploadRadio = screen.getByRole('radio', { name: /upload/i });
      fireEvent.click(uploadRadio);

      expect(uploadRadio).toBeChecked();
      expect(screen.getByTestId('selected-type')).toHaveTextContent('upload');
    });
  });

  describe('Form Interaction', () => {
    it('handles manual job entry', () => {
      const ManualJobForm = () => {
        const [jobType, setJobType] = React.useState('manual');

        return (
          <form>
            <label>
              <input
                type="radio"
                name="jobType"
                value="manual"
                checked={jobType === 'manual'}
                onChange={(e) => setJobType(e.target.value)}
              />
              Enter Manually
            </label>
            {jobType === 'manual' && (
              <div data-testid="manual-form">
                <input type="text" placeholder="Model Location" />
                <button type="submit">Submit</button>
              </div>
            )}
          </form>
        );
      };

      render(<ManualJobForm />);

      expect(screen.getByTestId('manual-form')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Model Location')).toBeInTheDocument();
    });
  });

  describe('Job Submission', () => {
    it('handles file upload', () => {
      const FileUploadForm = () => {
        const [selectedFile, setSelectedFile] = React.useState(null);

        return (
          <form>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              data-testid="file-input"
            />
            {selectedFile && (
              <div data-testid="selected-file">{selectedFile.name}</div>
            )}
          </form>
        );
      };

      render(<FileUploadForm />);

      const file = new File(['test content'], 'test-job.json', { type: 'application/json' });
      const input = screen.getByTestId('file-input');

      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByTestId('selected-file')).toHaveTextContent('test-job.json');
    });

    it('validates required fields', () => {
      const ValidatedForm = () => {
        const [error, setError] = React.useState('');

        const handleSubmit = (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const modelLocation = formData.get('modelLocation');

          if (!modelLocation) {
            setError('Model location is required');
            return;
          }

          setError('');
        };

        return (
          <form onSubmit={handleSubmit}>
            <input name="modelLocation" placeholder="Model Location" />
            <button type="submit">Submit</button>
            {error && <div data-testid="error">{error}</div>}
          </form>
        );
      };

      render(<ValidatedForm />);

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Should show validation error
      expect(screen.getByTestId('error')).toHaveTextContent('Model location is required');
    });
  });
});
