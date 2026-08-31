import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentsPage } from './AgentsPage.tsx';
import { renderWithProviders } from '../test/renderApp.tsx';

describe('AgentsPage filtering', () => {
  it('filters by free-text search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AgentsPage />);

    expect(screen.getByText('Invoice Reconciliation Agent')).toBeInTheDocument();

    const search = screen.getByPlaceholderText(/Søk på navn/i);
    await user.type(search, 'invoice');

    expect(screen.getByText('Invoice Reconciliation Agent')).toBeInTheDocument();
    expect(screen.queryByText('Customer Insight Assistant')).not.toBeInTheDocument();
  });

  it('shows empty state when no match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AgentsPage />);
    const search = screen.getByPlaceholderText(/Søk på navn/i);
    await user.type(search, 'existerer-ikke-xyz');
    expect(
      screen.getByText(/Ingen agenter matcher filtrene/i),
    ).toBeInTheDocument();
  });
});
