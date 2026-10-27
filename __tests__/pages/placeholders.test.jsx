import React from 'react';
import { render, screen } from '@testing-library/react';

describe('placeholder routes', () => {
  it.each([
    ['../../pages/index', 'Dashboard'],
    ['../../pages/submit/index', 'Submit a job'],
    ['../../pages/jobs/index', 'My jobs'],
    ['../../pages/jobs/detail', 'Job detail'],
    ['../../pages/earnings/index', 'Earnings'],
  ])('renders the %s placeholder', (modulePath, heading) => {
    const Page = require(modulePath).default;
    render(<Page />);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByText('This page is not available yet.')).toBeInTheDocument();
  });

  it('renders the 404 page with a link back to /', () => {
    const NotFound = require('../../pages/404').default;
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the dashboard' })).toHaveAttribute('href', '/');
  });
});
