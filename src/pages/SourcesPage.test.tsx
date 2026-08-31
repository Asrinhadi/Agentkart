import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourcesPage } from './SourcesPage.tsx';
import { renderWithProviders } from '../test/renderApp.tsx';

function makeFile(content: string, name = 'test.json', type = 'application/json') {
  return new File([content], name, { type });
}

describe('SourcesPage import', () => {
  it('shows validation error for invalid JSON', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SourcesPage />);

    const input = screen.getByLabelText(/Velg registerfil/i);
    const bad = makeFile('{not json');
    await user.upload(input, bad);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/JSON/);
  });

  it('reload / demo data button restores demo counts', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SourcesPage />);
    const button = screen.getByRole('button', { name: /Last inn demodata/i });
    await user.click(button);
    expect(screen.getByText(/9 registrerte agenter/i)).toBeInTheDocument();
  });
});
