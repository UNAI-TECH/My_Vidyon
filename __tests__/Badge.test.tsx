import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Badge } from '../src/components/common/Badge';

describe('Badge Component Tests', () => {
  it('renders badge text in uppercase', async () => {
    await render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('ACTIVE')).toBeTruthy();
  });

  it('renders default badge variant', async () => {
    await render(<Badge>Pending</Badge>);
    expect(screen.getByText('PENDING')).toBeTruthy();
  });

  it('renders warning variant', async () => {
    await render(<Badge variant="warning">Attention</Badge>);
    expect(screen.getByText('ATTENTION')).toBeTruthy();
  });
});
