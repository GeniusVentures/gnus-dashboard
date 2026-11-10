import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithSession } from '../mocks/session';

describe('placeholder routes', () => {
  it('renders the home page and explains the two identities', async () => {
    const Page = require('../../pages/index').default;
    renderWithSession(<Page />);
    expect(await screen.findByRole('heading', { level: 1, name: /Submit compute jobs/ })).toBeInTheDocument();
    expect(screen.getByText(/account your jobs and their earnings belong to/)).toBeInTheDocument();
    expect(screen.getByText(/wallet that pays/)).toBeInTheDocument();
    ['Submit a job', 'My jobs', 'Earnings'].forEach((name) => {
      expect(screen.getAllByRole('link', { name }).length).toBeGreaterThan(0);
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
