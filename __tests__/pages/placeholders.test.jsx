import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithSession } from '../mocks/session';

describe('placeholder routes', () => {
  it('renders the home page and explains the two identities', async () => {
    const Page = require('../../pages/index').default;
    renderWithSession(<Page />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/node account that owns your jobs and earnings/)).toBeInTheDocument();
    expect(screen.getByText(/wallet that pays/)).toBeInTheDocument();
    ['Submit a job', 'My jobs', 'Earnings'].forEach((name) => {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    });
  });

  it.each([
    '../../pages/index',
    '../../pages/submit/index',
    '../../pages/jobs/index',
    '../../pages/jobs/detail',
    '../../pages/earnings/index',
  ])('gates %s: with no wallet it shows no page content', async (modulePath) => {
    jest.useFakeTimers();
    const Page = require(modulePath).default;
    renderWithSession(<Page />, { provider: null });
    expect(screen.getByRole('heading', { level: 1, name: 'Looking for GeniusWallet' })).toBeInTheDocument();
    expect(screen.queryByText('This page is not available yet.')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('renders the 404 page with a link back to /', () => {
    const NotFound = require('../../pages/404').default;
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the dashboard' })).toHaveAttribute('href', '/');
  });
});
