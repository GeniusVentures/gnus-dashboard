import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithSession } from '../mocks/session';

describe('placeholder routes', () => {
  it.each([
    ['../../pages/index', 'Dashboard'],
    ['../../pages/submit/index', 'Submit a job'],
    ['../../pages/jobs/index', 'My jobs'],
    ['../../pages/jobs/detail', 'Job detail'],
    ['../../pages/earnings/index', 'Earnings'],
  ])('renders the %s placeholder', async (modulePath, heading) => {
    const Page = require(modulePath).default;
    renderWithSession(<Page />);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByText('This page is not available yet.')).toBeInTheDocument();
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
