import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../../pages/index';

describe('placeholder routes', () => {
  it('renders the / placeholder', () => {
    render(<Dashboard />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('This page is not available yet.')).toBeInTheDocument();
  });
});
